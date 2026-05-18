'use client'
import { FiCheck, FiSave } from 'react-icons/fi'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  )
}

export default function SaveButton({
  status = 'idle',
  onClick,
  disabled,
  idleLabel = 'Guardar cambios',
  pendingLabel = 'Guardar ahora',
  savingLabel = 'Guardando…',
  savedLabel = 'Guardado',
  className = '',
}: {
  status?: SaveStatus
  onClick?: () => void
  disabled?: boolean
  idleLabel?: string
  pendingLabel?: string
  savingLabel?: string
  savedLabel?: string
  className?: string
}) {
  const saving = status === 'saving'
  const saved = status === 'saved'
  const pending = status === 'pending'
  const blocked = saving || saved || disabled

  return (
    <button
      type="button"
      disabled={blocked}
      aria-busy={saving}
      onClick={onClick}
      className={`inline-flex min-w-40 items-center justify-center gap-2 rounded-full bg-[var(--c-aqua)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)] disabled:cursor-default ${
        saved ? 'disabled:opacity-60' : 'disabled:opacity-70'
      } ${className}`}
    >
      {saving && <Spinner />}
      {saved && <FiCheck aria-hidden="true" className="text-base" />}
      {!saving && !saved && <FiSave aria-hidden="true" className="text-base" />}
      {saving ? savingLabel : saved ? savedLabel : pending ? pendingLabel : idleLabel}
    </button>
  )
}
