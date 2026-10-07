'use client'

import type { ReactNode } from 'react'
import { FiClipboard } from 'react-icons/fi'
import Avatar from '@/components/ui/avatar'

export default function ClassStudentRow({
  name,
  actions,
  onEdit,
  disabled = false,
}: {
  name: string
  actions?: ReactNode
  onEdit?: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
      <div className="flex min-w-0 basis-44 grow items-center gap-2">
        <Avatar name={name} size={36} tone="white" />
        <strong className="min-w-0 text-sm leading-snug">{name}</strong>
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
        {actions}
        {onEdit && (
          <button
            type="button"
            disabled={disabled}
            onClick={onEdit}
            aria-label={`Editar la clase de ${name}`}
            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-(--c-border) bg-white text-(--c-ocean) before:absolute before:-inset-1.5 disabled:opacity-50"
          >
            <FiClipboard aria-hidden="true" size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
