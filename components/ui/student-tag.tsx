'use client'

import { FiClipboard, FiUser } from 'react-icons/fi'

export default function StudentTag({
  name,
  status = 'enrolled',
  onEdit,
  editLabel,
  disabled = false,
}: {
  name: string
  status?: 'enrolled' | 'pending'
  onEdit?: () => void
  editLabel?: string
  disabled?: boolean
}) {
  return (
    <span className="inline-flex w-full items-center gap-2 rounded-xl border border-(--c-border) bg-white px-3 py-2 text-sm text-(--c-ocean)">
      <FiUser aria-hidden="true" size={14} className="shrink-0 text-(--c-text-2)" />
      <strong className="min-w-0 flex-1 truncate" title={name}>
        {name}
      </strong>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}
      >
        {status === 'pending' ? 'Pendiente' : 'Inscrito'}
      </span>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label={editLabel || `Editar la clase de ${name}`}
          className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-full text-(--c-ocean) before:absolute before:-inset-2 hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
        >
          <FiClipboard aria-hidden="true" size={16} />
        </button>
      )}
    </span>
  )
}
