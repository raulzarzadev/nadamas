'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiCheck, FiCopy, FiX } from 'react-icons/fi'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'

export default function ProfileShareDialog({
  title,
  publicUrl,
  onClose,
  returnFocus,
}: {
  title: string
  publicUrl: string
  onClose: () => void
  returnFocus: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  useEffect(() => {
    const dialog = dialogRef.current
    const overflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = overflow
      returnFocus()
    }
  }, [returnFocus])
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="profile-share-title"
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          onClose()
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 text-(--c-ocean) shadow-[var(--shadow-md)] backdrop:bg-[rgba(10,37,64,0.55)] sm:p-7"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="profile-share-title" className="text-xl font-extrabold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid min-h-11 min-w-11 place-items-center rounded-full text-(--c-text-2) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
        >
          <FiX aria-hidden="true" />
        </button>
      </div>
      <div className="grid justify-items-center gap-4">
        <div className="rounded-[var(--r-sm)] border border-(--c-border) bg-white p-3">
          <QRCodeCanvas
            value={publicUrl}
            size={210}
            includeMargin
            aria-label={`Código QR: ${title}`}
          />
        </div>
        <p className="w-full break-all rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-center text-sm text-(--c-text-2)">
          {publicUrl}
        </p>
        {status !== 'idle' && (
          <p
            role="status"
            className="flex items-center gap-1 text-sm font-semibold text-(--c-ocean)"
          >
            {status === 'copied' && <FiCheck aria-hidden="true" />}
            {status === 'copied'
              ? 'Enlace copiado.'
              : 'No se pudo copiar el enlace. Inténtalo de nuevo.'}
          </p>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await copyTextToClipboard(publicUrl)
              setStatus('copied')
            } catch {
              setStatus('error')
            }
          }}
          className="btn btn-primary min-h-11"
        >
          <FiCopy aria-hidden="true" /> Copiar enlace
        </button>
      </div>
    </dialog>,
    document.body
  )
}
