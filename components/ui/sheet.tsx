'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

export default function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,37,64,0.35)] backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="w-full bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-20px_60px_-30px_rgba(10,37,64,0.5)] [animation:sheet-slide-up_0.3s_var(--ease-expo)] rounded-t-[26px] sm:max-w-md sm:rounded-[26px] sm:[animation:none]">
        <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-[var(--c-border)] sm:hidden" />
        {children}
      </div>
    </div>
  )
}
