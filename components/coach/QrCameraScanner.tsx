'use client'

import { useEffect, useRef, useState } from 'react'
import { FiCamera } from 'react-icons/fi'
import { parseCredentialQr } from '@/lib/athlete-identity'

export default function QrCameraScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const generation = useRef(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [value, setValue] = useState('')

  function stop() {
    generation.current += 1
    controlsRef.current?.stop()
    controlsRef.current = null
    const stream = videoRef.current?.srcObject
    if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream)
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    if (videoRef.current) videoRef.current.srcObject = null
    setRunning(false)
  }

  useEffect(
    () => () => {
      generation.current += 1
      controlsRef.current?.stop()
      const stream = videoRef.current?.srcObject
      if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream)
        stream.getTracks().forEach((track) => {
          track.stop()
        })
    },
    []
  )

  function accept(raw: string) {
    stop()
    if (!parseCredentialQr(raw)) {
      setError('Este QR no corresponde a una credencial de Nadamas.')
      return
    }
    setError('')
    onScan(raw.trim())
  }

  async function start() {
    stop()
    const scanGeneration = generation.current
    setError('')
    setRunning(true)
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      if (scanGeneration !== generation.current || !videoRef.current) return
      const reader = new BrowserQRCodeReader()
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: 'environment' } } },
        videoRef.current,
        (result, _error, scanControls) => {
          if (scanGeneration !== generation.current || !result) return
          scanControls.stop()
          accept(result.getText())
        }
      )
      if (scanGeneration !== generation.current) controls.stop()
      else controlsRef.current = controls
    } catch {
      if (scanGeneration !== generation.current) return
      stop()
      setError('No pudimos abrir la cámara. Revisa el permiso o busca al atleta por nombre o ID.')
    }
  }

  return (
    <div className="grid gap-3">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Cámara para escanear credenciales"
        className={`${running ? '' : 'hidden'} aspect-square w-full max-h-64 rounded-xl bg-black object-cover`}
      />
      <button
        type="button"
        className="btn btn-outline min-h-11"
        onClick={() => (running ? stop() : void start())}
      >
        <FiCamera aria-hidden="true" /> {running ? 'Detener cámara' : 'Escanear credencial'}
      </button>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          accept(value)
        }}
        className="grid gap-2"
      >
        <label className="grid gap-1 text-sm font-semibold">
          O pega el contenido del QR
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={100}
            autoComplete="off"
            className="min-h-11 w-full min-w-0 rounded-xl border border-(--c-border) px-3 font-normal"
            placeholder="nadamas:credential:…"
          />
        </label>
        <button type="submit" className="btn btn-outline min-h-11" disabled={!value.trim()}>
          Buscar credencial
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
          {error}
        </p>
      )}
    </div>
  )
}
