'use client'

import { useState } from 'react'

export default function VerifiedBadge({
  verified,
  className = '',
}: {
  verified?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)

  if (!verified) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm font-semibold text-[var(--c-text-2)] ${className}`}
      >
        Pendiente de verificación
      </span>
    )
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label="Perfil verificado"
        aria-expanded={open}
        className="grid h-6 w-6 place-items-center rounded-full bg-[#1d9bf0] text-white shadow-[0_2px_8px_rgba(29,155,240,0.25)] transition hover:bg-[#0c8de4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d9bf0]"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <span aria-hidden="true" className="text-sm font-black leading-none">
          ✓
        </span>
      </button>

      {open && (
        <span className="absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--c-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--c-ocean)] shadow-[var(--shadow-sm)]">
          Perfil verificado
        </span>
      )}
    </span>
  )
}
