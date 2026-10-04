'use client'

import {
  keepFocusedFieldVisible,
  modalViewportStyle,
  useKeyboardSafeArea,
} from '@comps/hooks/useKeyboardSafeArea'
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
  showFooterClose = true,
  closeDisabled = false,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label?: string
  keyboardAware?: boolean
  fullBleedMobile?: boolean
  modalTopGap?: boolean
  showFooterClose?: boolean
  closeDisabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}) {
  const keyboardViewport = useKeyboardSafeArea()
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const openRef = useRef(open)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  openRef.current = open

  const requestClose = useCallback(() => {
    if (closingRef.current || closeDisabled) return
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
  }, [closeDisabled, onClose])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    closingRef.current = false
    setClosing(false)
    setDragY(0)
    setIsDragging(false)
    dragStartY.current = null
  }, [open])

  useEffect(() => {
    if (!open || !keyboardViewport) return
    const frame = requestAnimationFrame(() => {
      if (dialogRef.current) keepFocusedFieldVisible(dialogRef.current)
    })
    return () => cancelAnimationFrame(frame)
  }, [open, keyboardViewport])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  if (!open) return null
  const desktopWidth = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
  }[size]
  const sheetAnimation =
    fullBleedMobile || !keyboardAware
      ? closing
        ? '[animation:sheet-slide-down_0.3s_var(--ease-expo)] motion-reduce:[animation:none]'
        : '[animation:sheet-slide-up_0.3s_var(--ease-expo)] motion-reduce:[animation:none]'
      : ''
  const viewportStyle = modalViewportStyle(keyboardViewport)

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className={`fixed inset-0 z-50 flex justify-center bg-[rgba(10,37,64,0.35)] backdrop-blur-[2px] ${
        keyboardAware
          ? fullBleedMobile
            ? 'items-end overflow-y-auto p-0 sm:items-center sm:p-4'
            : 'items-center overflow-y-auto p-4'
          : 'items-end sm:items-center sm:p-4'
      }`}
      style={viewportStyle}
      onFocusCapture={() => {
        requestAnimationFrame(() => {
          if (dialogRef.current) keepFocusedFieldVisible(dialogRef.current)
        })
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
      onKeyDown={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('[role="dialog"]') !== dialogRef.current
        ) {
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          requestClose()
          return
        }
        if (event.key !== 'Tab') return
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) || []
        ).filter((element) => element.getClientRects().length > 0)
        if (!focusable.length) {
          event.preventDefault()
          dialogRef.current?.focus()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === dialogRef.current)
        ) {
          event.preventDefault()
          last.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === dialogRef.current)
        ) {
          event.preventDefault()
          first.focus()
        }
      }}
    >
      <div
        ref={sheetRef}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`relative w-full bg-white shadow-[0_-20px_60px_-30px_rgba(10,37,64,0.5)] ${
          showFooterClose ? 'flex flex-col' : ''
        } ${isDragging ? 'transition-none' : ''} ${
          fullBleedMobile
            ? `min-h-[calc(var(--sheet-viewport-height,100dvh)-0.5rem)] max-h-[calc(var(--sheet-viewport-height,100dvh)-0.5rem)] overflow-y-auto rounded-t-[26px] rounded-b-none px-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] ${sheetAnimation} ${modalTopGap ? 'pt-4 sm:pt-6' : 'pt-2 sm:pt-5'} sm:min-h-0 sm:max-h-[calc(var(--sheet-viewport-height,100dvh)-2rem)] sm:rounded-[26px] sm:px-5 sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${desktopWidth} sm:[animation:none]`
            : `px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${modalTopGap ? 'pt-4 sm:pt-6' : 'pt-5'} ${
                keyboardAware
                  ? `max-h-[calc(var(--sheet-viewport-height,100dvh)-2rem)] overflow-y-auto rounded-[26px] ${desktopWidth}`
                  : `${sheetAnimation} max-h-[calc(var(--sheet-viewport-height,100dvh)-0.5rem)] overflow-y-auto rounded-t-[26px] ${desktopWidth} sm:max-h-[calc(var(--sheet-viewport-height,100dvh)-2rem)] sm:rounded-[26px] sm:[animation:none]`
              }`
        }`}
      >
        <div
          onTouchStart={(event) => {
            if (closeDisabled) return
            dragStartY.current = event.touches[0].clientY
            setIsDragging(true)
          }}
          onTouchMove={(event) => {
            if (dragStartY.current === null || closeDisabled) return
            const offset = event.touches[0].clientY - dragStartY.current
            setDragY(offset > 0 ? offset : 0)
          }}
          onTouchEnd={() => {
            const offset = dragY
            dragStartY.current = null
            setIsDragging(false)
            if (offset > 90) {
              setDragY(0)
              requestClose()
            } else {
              setDragY(0)
            }
          }}
          className="sticky top-0 z-10 -mx-0 flex touch-none justify-center bg-white pt-1 pb-1 sm:hidden"
        >
          <button
            type="button"
            aria-label="Cerrar modal"
            title="Cerrar"
            disabled={closeDisabled}
            onClick={requestClose}
            className="group relative grid h-11 w-16 place-items-center rounded-full text-[var(--c-text-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
          >
            <span className="h-1 w-10 rounded-full bg-[var(--c-border)] transition duration-150 group-hover:scale-x-0 group-hover:opacity-0 group-focus-visible:scale-x-0 group-focus-visible:opacity-0" />
            <FiX
              aria-hidden="true"
              className="absolute h-5 w-5 opacity-0 transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          </button>
        </div>
        {children}
        {showFooterClose && (
          <button
            type="button"
            disabled={closeDisabled}
            onClick={requestClose}
            className="mt-auto min-h-11 self-center px-4 py-3 text-sm font-medium text-(--c-text-2) underline-offset-4 transition-colors hover:text-(--c-ocean) hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  )
}
