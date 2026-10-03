'use client'

import Sheet from '@comps/ui/sheet'
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiCheck, FiCopy } from 'react-icons/fi'
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
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  useEffect(() => {
    return () => {
      returnFocus()
    }
  }, [returnFocus])
  return createPortal(
    <Sheet open onClose={onClose} label={title} keyboardAware size="sm">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-(--c-ocean)">{title}</h2>
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
    </Sheet>,
    document.body
  )
}
