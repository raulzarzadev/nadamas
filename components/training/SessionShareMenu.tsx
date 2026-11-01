'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { FiShare2 } from 'react-icons/fi'
import WorkoutTransferSheet from '@/components/coach/WorkoutTransferSheet'
import Sheet from '@/components/ui/sheet'
import type { ClassTrainingBlock } from '@/lib/class-training'
import { postAuthed } from '@/lib/client/authed-api'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'
import { reportInternalError } from '@/lib/user-facing-error'

export default function SessionShareMenu({
  session,
  accountRole,
  onDuplicated,
  shareable = true,
  coachOwned = false,
}: {
  session: { id: string; title: string; description: string; training: ClassTrainingBlock[] }
  accountRole: 'athlete' | 'coach'
  onDuplicated?: (id: string) => void
  shareable?: boolean
  coachOwned?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [transfer, setTransfer] = useState(false)
  const [qr, setQr] = useState(false)
  const [url, setUrl] = useState('')
  const getUrl = async () => {
    let id = session.id
    if (coachOwned) {
      const response = await postAuthed('/api/coach/session-share', { id, kind: 'standalone' })
      if (!response.ok) throw new Error('SESSION_SHARE_FAILED')
      id = ((await response.json()) as { token: string }).token
    }
    return `${window.location.origin}/entreno/${encodeURIComponent(id)}`
  }
  async function duplicate() {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const response = await postAuthed(
        accountRole === 'coach'
          ? '/api/coach/standalone-sessions'
          : '/api/athlete/training-sessions',
        {
          title: `${session.title.slice(0, 94)} copia`,
          description: session.description,
          visibility: 'public',
          tags: [],
          training: session.training.map((block) => ({
            ...block,
            id: crypto.randomUUID(),
            series: block.series.map((series) => ({ ...series, id: crypto.randomUUID() })),
          })),
        }
      )
      if (!response.ok) throw new Error('SESSION_DUPLICATE_FAILED')
      const result = (await response.json()) as { item: { id: string } }
      onDuplicated?.(result.item.id)
      setMessage('Entreno duplicado en tu cuenta.')
    } catch (cause) {
      reportInternalError('SESSION_DUPLICATE', cause)
      setMessage('No pudimos duplicar el entreno. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="relative">
      <details className="relative">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)">
          <FiShare2 aria-hidden="true" /> Compartir
        </summary>
        <div className="absolute right-0 z-20 grid min-w-48 rounded-xl border border-(--c-border) bg-white p-1 shadow-lg">
          <button
            type="button"
            disabled={busy}
            onClick={() => void duplicate()}
            className="min-h-11 rounded-lg px-3 text-left text-sm hover:bg-(--c-surface) disabled:opacity-50"
          >
            {busy ? 'Duplicando…' : 'Duplicar en mi cuenta'}
          </button>
          <button
            type="button"
            onClick={() => setTransfer(true)}
            className="min-h-11 rounded-lg px-3 text-left text-sm hover:bg-(--c-surface)"
          >
            Transferir
          </button>
          <button
            type="button"
            disabled={!shareable}
            onClick={() =>
              void getUrl()
                .then(copyTextToClipboard)
                .then(() => setMessage('Enlace copiado.'))
                .catch(() => setMessage('No pudimos copiar el enlace. Inténtalo de nuevo.'))
            }
            className="min-h-11 rounded-lg px-3 text-left text-sm hover:bg-(--c-surface) disabled:opacity-50"
          >
            Copiar enlace
          </button>
          <button
            type="button"
            disabled={!shareable}
            onClick={() =>
              void getUrl()
                .then((link) => {
                  setUrl(link)
                  setQr(true)
                })
                .catch(() => setMessage('No pudimos crear el enlace. Inténtalo de nuevo.'))
            }
            className="min-h-11 rounded-lg px-3 text-left text-sm hover:bg-(--c-surface) disabled:opacity-50"
          >
            Mostrar QR
          </button>
        </div>
      </details>
      {message && (
        <p role="status" className="text-xs text-(--c-text-2)">
          {message}
        </p>
      )}
      {!shareable && (
        <p className="text-xs text-(--c-text-2)">
          Haz público el entreno para compartir el enlace.
        </p>
      )}
      {transfer && (
        <WorkoutTransferSheet
          workout={{
            id: session.id,
            title: session.title,
            observations: session.description,
            blocks: session.training,
          }}
          allowImport={false}
          disabled={false}
          onClose={() => setTransfer(false)}
          onImport={() => {}}
        />
      )}
      <Sheet open={qr} onClose={() => setQr(false)} label="Código QR del entreno">
        <div className="grid justify-items-center gap-4 p-4">
          <h2 className="text-lg font-bold">Código QR del entreno</h2>
          {url && <QRCodeSVG value={url} size={220} />}
        </div>
      </Sheet>
    </div>
  )
}
