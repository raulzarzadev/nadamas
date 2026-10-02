'use client'

import { useKeyboardSafeArea } from '@comps/hooks/useKeyboardSafeArea'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'

export default function Sheet({
  open,
  onClose,
  children,
  label,
  keyboardAware = false,
  fullBleedMobile = false,
  modalTopGap = false,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label?: string
  keyboardAware?: boolean
  fullBleedMobile?: boolean
  modalTopGap?: boolean
}) {
  const keyboardSafeArea = useKeyboardSafeArea()
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const openRef = useRef(open)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  openRef.current = open

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      onClose()
      closeTimer.current = setTimeout(() => {
        if (openRef.current) {
          closingRef.current = false
          setClosing(false)
        }
      }, 50)
    }, 300)
  }, [onClose])

  useEffect(() => {
    if (!open) return
    closingRef.current = false
    setClosing(false)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && requestClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, requestClose])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  if (!open) return null
  const sheetAnimation =
    fullBleedMobile || !keyboardAware
      ? closing
        ? '[animation:sheet-slide-down_0.3s_var(--ease-expo)]'
        : '[animation:sheet-slide-up_0.3s_var(--ease-expo)]'
      : ''

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-50 flex justify-center bg-[rgba(10,37,64,0.35)] backdrop-blur-[2px] ${
        keyboardAware
          ? fullBleedMobile
            ? 'items-end overflow-y-auto p-0 sm:items-center sm:p-4'
            : 'items-center overflow-y-auto p-4'
          : 'items-end sm:items-center sm:p-4'
      }`}
      style={
        keyboardAware && keyboardSafeArea
          ? { paddingBottom: `calc(${keyboardSafeArea}px + 1rem)` }
          : undefined
      }
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') requestClose()
      }}
    >
      <div
        className={`relative w-full bg-white shadow-[0_-20px_60px_-30px_rgba(10,37,64,0.5)] ${
          fullBleedMobile
            ? `min-h-[calc(100dvh-0.5rem)] max-h-[calc(100dvh-0.5rem)] overflow-y-auto rounded-t-[26px] rounded-b-none px-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] ${sheetAnimation} ${modalTopGap ? 'pt-4 sm:pt-6' : 'pt-2 sm:pt-5'} sm:min-h-0 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[26px] sm:px-5 sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:[animation:none]`
            : `px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${modalTopGap ? 'pt-4 sm:pt-6' : 'pt-5'} ${
                keyboardAware
                  ? 'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[26px] sm:max-w-md'
                  : `${sheetAnimation} rounded-t-[26px] sm:max-w-md sm:rounded-[26px] sm:[animation:none]`
              }`
        }`}
      >
        <button
          type="button"
          aria-label="Cerrar modal"
          title="Cerrar"
          onClick={requestClose}
          className="group relative mx-auto mb-2 grid h-8 w-10 place-items-center rounded-full text-[var(--c-text-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] sm:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-[var(--c-border)] transition duration-150 group-hover:scale-x-0 group-hover:opacity-0 group-focus-visible:scale-x-0 group-focus-visible:opacity-0" />
          <FiX
            aria-hidden="true"
            className="absolute h-5 w-5 opacity-0 transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </button>
        {children}
      </div>
    </div>
  )
}
