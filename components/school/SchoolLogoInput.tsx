'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { FiImage, FiMinus, FiPlus, FiX } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { reportInternalError } from '@/lib/user-facing-error'

export default function SchoolLogoInput({
  value,
  onChange,
  currentUrl,
  disabled = false,
  progress,
  onEditingChange,
}: {
  value: File | null
  onChange: (file: File) => void
  currentUrl?: string | null
  disabled?: boolean
  onEditingChange?: (editing: boolean) => void
  progress?: number | null
}) {
  const id = useId()
  const drag = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    x: number
    y: number
  } | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [source, setSource] = useState<File | null>(null)
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [zoom, setZoom] = useState(1)
  const [x, setX] = useState(50)
  const [y, setY] = useState(50)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    onEditingChange?.(Boolean(source) || processing)
    return () => onEditingChange?.(false)
  }, [source, processing, onEditingChange])

  useEffect(() => {
    if (!value) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value])
  useEffect(() => {
    if (!source) {
      setBitmap(null)
      return
    }
    let active = true
    let decoded: ImageBitmap | null = null
    setProcessing(true)
    createImageBitmap(source)
      .then((image) => {
        decoded = image
        if (!active) {
          image.close()
          return
        }
        setBitmap(image)
        setProcessing(false)
      })
      .catch((err) => {
        if (!active) return
        reportInternalError('SCHOOL_LOGO_DECODE', err)
        setError('No pudimos abrir la imagen. Prueba con otra.')
        setProcessing(false)
        setSource(null)
      })
    return () => {
      active = false
      decoded?.close()
    }
  }, [source])
  useEffect(() => {
    const target = canvas.current
    if (!target || !bitmap) return
    const ctx = target.getContext('2d')
    if (!ctx) return
    const edge = Math.min(bitmap.width, bitmap.height) / zoom
    const scale = 280 / edge
    const left = ((bitmap.width - edge) * x) / 100
    const top = ((bitmap.height - edge) * y) / 100
    ctx.clearRect(0, 0, target.width, target.height)
    ctx.fillStyle = '#e8edf0'
    ctx.fillRect(0, 0, 800, 400)
    ctx.drawImage(
      bitmap,
      260 - left * scale,
      60 - top * scale,
      bitmap.width * scale,
      bitmap.height * scale
    )
    ctx.fillStyle = 'rgba(0,0,0,.55)'
    ctx.fillRect(0, 0, 800, 60)
    ctx.fillRect(0, 340, 800, 60)
    ctx.fillRect(0, 60, 260, 280)
    ctx.fillRect(540, 60, 260, 280)
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.strokeRect(260, 60, 280, 280)
    ctx.strokeStyle = 'rgba(255,255,255,.45)'
    ctx.lineWidth = 1
    for (const offset of [280 / 3, 560 / 3]) {
      ctx.beginPath()
      ctx.moveTo(260 + offset, 60)
      ctx.lineTo(260 + offset, 340)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(260, 60 + offset)
      ctx.lineTo(540, 60 + offset)
      ctx.stroke()
    }
  }, [bitmap, zoom, x, y])

  async function apply() {
    if (!source || !canvas.current || !bitmap) return
    setProcessing(true)
    const target = document.createElement('canvas')
    target.width = 512
    target.height = 512
    try {
      const ctx = target.getContext('2d')
      if (!ctx) throw new Error('LOGO_CANVAS_UNAVAILABLE')
      const edge = Math.min(bitmap.width, bitmap.height) / zoom
      ctx.drawImage(
        bitmap,
        ((bitmap.width - edge) * x) / 100,
        ((bitmap.height - edge) * y) / 100,
        edge,
        edge,
        0,
        0,
        512,
        512
      )
      const blob = await new Promise<Blob>((resolve, reject) =>
        target.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('LOGO_ENCODE_FAILED'))),
          'image/png'
        )
      )
      onChange(
        new File([blob], `${source.name.replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' })
      )
      setSource(null)
    } catch (err) {
      reportInternalError('SCHOOL_LOGO_CROP', err)
      setError('No pudimos ajustar la imagen. Inténtalo de nuevo.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="grid gap-3 text-sm text-(--c-ocean)">
      <label
        htmlFor={`${id}-file`}
        className="flex min-h-24 cursor-pointer items-center gap-4 rounded-[var(--r-sm)] border border-dashed border-(--c-ocean-mid) bg-(--c-surface) p-4"
      >
        <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
          {preview || currentUrl ? (
            <Image
              src={preview || currentUrl || ''}
              alt="Logo de la escuela"
              fill
              unoptimized
              className="object-contain"
            />
          ) : (
            <FiImage aria-hidden="true" size={28} />
          )}
        </div>
        <span>
          <span className="block font-bold">
            {value || currentUrl ? 'Cambiar logo' : 'Selecciona una imagen'}
          </span>
          <span className="text-xs text-(--c-text-2)">PNG, JPG o WEBP · máximo 5 MB</span>
        </span>
        <input
          id={`${id}-file`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={disabled || processing}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setError(null)
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
              setError('Selecciona una imagen PNG, JPG o WEBP.')
              return
            }
            if (file.size > 5 * 1024 * 1024) {
              setError('El logo debe pesar menos de 5 MB.')
              return
            }
            setBitmap(null)
            setZoom(1)
            setX(50)
            setY(50)
            setSource(file)
          }}
        />
      </label>
      {processing && <p role="status">Preparando imagen…</p>}
      {source && bitmap && (
        <Sheet
          open
          onClose={() => {
            if (!processing) setSource(null)
          }}
          label="Recortar imagen"
          keyboardAware
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold">Recortar imagen</h3>
            <button
              type="button"
              aria-label="Cerrar recorte"
              disabled={processing}
              onClick={() => setSource(null)}
              className="btn btn-ghost btn-square"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
          <p id={`${id}-instructions`} className="mb-3 text-xs text-(--c-text-2)">
            Arrastra la imagen para encuadrarla. También puedes usar las flechas del teclado.
          </p>
          <canvas
            ref={canvas}
            width={800}
            height={400}
            tabIndex={0}
            aria-label="Ajustar posición de la imagen"
            aria-describedby={`${id}-instructions`}
            className="w-full touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--c-aqua-strong) cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => {
              if (processing || disabled) return
              event.currentTarget.setPointerCapture(event.pointerId)
              drag.current = {
                pointerId: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                x,
                y,
              }
            }}
            onPointerMove={(event) => {
              const start = drag.current
              if (!start || start.pointerId !== event.pointerId) return
              const edge = Math.min(bitmap.width, bitmap.height) / zoom
              const scale = 280 / edge
              const ratio = 800 / event.currentTarget.getBoundingClientRect().width
              if (bitmap.width > edge)
                setX(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      start.x -
                        (((event.clientX - start.clientX) * ratio) /
                          scale /
                          (bitmap.width - edge)) *
                          100
                    )
                  )
                )
              if (bitmap.height > edge)
                setY(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      start.y -
                        (((event.clientY - start.clientY) * ratio) /
                          scale /
                          (bitmap.height - edge)) *
                          100
                    )
                  )
                )
            }}
            onPointerUp={() => {
              drag.current = null
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
            onLostPointerCapture={() => {
              drag.current = null
            }}
            onKeyDown={(event) => {
              if (processing || disabled) return
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
                event.preventDefault()
              if (event.key === 'ArrowLeft') setX((value) => Math.min(100, value + 5))
              if (event.key === 'ArrowRight') setX((value) => Math.max(0, value - 5))
              if (event.key === 'ArrowUp') setY((value) => Math.min(100, value + 5))
              if (event.key === 'ArrowDown') setY((value) => Math.max(0, value - 5))
            }}
          />
          <div className="my-4 flex items-center gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-square"
              aria-label="Alejar imagen"
              disabled={zoom <= 1 || processing}
              onClick={() => setZoom((value) => Math.max(1, value - 0.1))}
            >
              <FiMinus aria-hidden="true" />
            </button>
            <input
              aria-label="Acercar imagen"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              disabled={processing}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              className="btn btn-ghost btn-square"
              aria-label="Acercar imagen"
              disabled={zoom >= 3 || processing}
              onClick={() => setZoom((value) => Math.min(3, value + 0.1))}
            >
              <FiPlus aria-hidden="true" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={processing || disabled}
              onClick={apply}
            >
              Usar imagen
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={processing || disabled}
              onClick={() => setSource(null)}
            >
              Cancelar
            </button>
          </div>
        </Sheet>
      )}
      {progress != null && (
        <div role="status" className="grid gap-1">
          <p>Subiendo logo… {progress}%</p>
          <progress
            aria-label="Subida del logo"
            className="progress progress-primary w-full"
            max={100}
            value={progress}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-(--c-error,#b91c1c)">
          {error}
        </p>
      )}
    </div>
  )
}
