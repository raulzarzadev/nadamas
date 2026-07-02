'use client'

import { useKeyboardSafeArea } from '@comps/hooks/useKeyboardSafeArea'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

export default function Sheet({
  open,
  onClose,
  children,
  label,
  keyboardAware = false,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label?: string
  keyboardAware?: boolean
}) {
  const keyboardSafeArea = useKeyboardSafeArea()

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
      className={`fixed inset-0 z-50 flex justify-center bg-[rgba(10,37,64,0.35)] backdrop-blur-[2px] ${
        keyboardAware ? 'items-center overflow-y-auto p-4' : 'items-end sm:items-center sm:p-4'
      }`}
      style={
        keyboardAware && keyboardSafeArea
          ? { paddingBottom: `calc(${keyboardSafeArea}px + 1rem)` }
          : undefined
      }
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div
        className={`w-full bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-20px_60px_-30px_rgba(10,37,64,0.5)] ${
          keyboardAware
            ? 'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[26px] sm:max-w-md'
            : '[animation:sheet-slide-up_0.3s_var(--ease-expo)] rounded-t-[26px] sm:max-w-md sm:rounded-[26px] sm:[animation:none]'
        }`}
      >
        <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-[var(--c-border)] sm:hidden" />
        {children}
      </div>
    </div>
  )
}
