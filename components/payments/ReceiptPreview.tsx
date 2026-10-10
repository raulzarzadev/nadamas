'use client'

import { useEffect, useState } from 'react'
import { FiFileText, FiMaximize2 } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'

export default function ReceiptPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const next = URL.createObjectURL(file)
    setUrl(next)
    setOpen(false)
    return () => URL.revokeObjectURL(next)
  }, [file])
  if (!url) return null
  const pdf = file.type === 'application/pdf'
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver comprobante completo"
        className="grid min-w-0 gap-2 rounded-xl border border-slate-400 bg-white p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {pdf ? (
          <span className="flex min-h-20 items-center justify-center gap-2 bg-base-200 rounded-lg">
            <FiFileText aria-hidden="true" className="size-8" /> PDF
          </span>
        ) : (
          // biome-ignore lint/performance/noImgElement: Local blob preview; no network or Next image optimization.
          <img
            src={url}
            alt="Vista previa del comprobante seleccionado"
            className="h-40 w-full rounded-lg object-contain"
          />
        )}
        <span className="flex min-w-0 items-center justify-between gap-2 text-xs">
          <span className="truncate">{file.name}</span>
          <FiMaximize2 aria-hidden="true" className="shrink-0" />
        </span>
        <span className="text-xs font-semibold">Ver comprobante completo</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Comprobante completo" size="2xl">
        <div className="grid min-w-0 gap-3">
          <h2 className="text-lg font-bold">Comprobante</h2>
          {pdf ? (
            <iframe
              src={url}
              title="Comprobante PDF completo"
              className="h-[65dvh] w-full rounded-lg border border-slate-300"
            />
          ) : (
            // biome-ignore lint/performance/noImgElement: Local blob preview; preserve the complete uploaded image.
            <img
              src={url}
              alt="Comprobante completo"
              className="h-auto w-full rounded-lg object-contain"
            />
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline min-h-11 justify-self-start text-xs"
          >
            Abrir archivo completo
          </a>
        </div>
      </Sheet>
    </>
  )
}
