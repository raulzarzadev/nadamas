'use client'

import type { ReactNode } from 'react'

/**
 * Small blue info dialog without borders. Renders nothing when closed so it
 * can stay mounted next to its trigger: `{infoOpen && ...}` is not needed,
 * just pass `open`.
 */
export default function InfoModal({
  open,
  onClose,
  label,
  closeLabel = 'Entendido',
  children,
}: {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog. */
  label: string
  /** Text of the dismiss button. */
  closeLabel?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[60] grid place-items-center p-6"
    >
      <button
        type="button"
        aria-label={`Cerrar: ${label}`}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(10,37,64,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
      />
      <div className="relative w-full max-w-xs rounded-[var(--r-md)] bg-[var(--c-ocean-mid)] p-5 text-white shadow-[var(--shadow-md)]">
        <div className="text-sm leading-relaxed">{children}</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white/15 px-5 text-sm font-bold text-white transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  )
}
