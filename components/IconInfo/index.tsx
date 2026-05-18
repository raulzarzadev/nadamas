'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiAlertOctagon, FiAlertTriangle, FiInfo } from 'react-icons/fi'

type IconInfoType = 'info' | 'warning' | 'danger'

const STYLES: Record<IconInfoType, { icon: typeof FiInfo; color: string; bg: string }> = {
  info: { icon: FiInfo, color: '#1d4ed8', bg: 'rgba(29,78,216,0.10)' },
  warning: { icon: FiAlertTriangle, color: '#b45309', bg: 'rgba(180,83,9,0.10)' },
  danger: { icon: FiAlertOctagon, color: '#b91c1c', bg: 'rgba(185,28,28,0.10)' },
}

export default function IconInfo({
  type = 'info',
  content,
  label = 'Más información',
  size = 18,
}: {
  type?: IconInfoType
  content: ReactNode
  label?: string
  size?: number
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const tooltipRef = useRef<HTMLSpanElement | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>()
  const [isPositioned, setIsPositioned] = useState(false)
  const { icon: Icon, color, bg } = STYLES[type]

  useLayoutEffect(() => {
    if (!open) return

    function placeTooltip() {
      const button = buttonRef.current
      const tooltip = tooltipRef.current
      if (!button || !tooltip) return

      const viewportPadding = 16
      const gap = 8
      const buttonRect = button.getBoundingClientRect()
      const tooltipWidth = Math.min(320, window.innerWidth - viewportPadding * 2)
      const tooltipHeight = tooltip.offsetHeight
      const preferredLeft = buttonRect.right - tooltipWidth
      const left = Math.min(
        Math.max(preferredLeft, viewportPadding),
        window.innerWidth - tooltipWidth - viewportPadding
      )
      const fitsBelow =
        buttonRect.bottom + gap + tooltipHeight <= window.innerHeight - viewportPadding
      const top = fitsBelow
        ? buttonRect.bottom + gap
        : Math.max(viewportPadding, buttonRect.top - tooltipHeight - gap)

      setTooltipStyle({
        left,
        top,
        width: tooltipWidth,
      })
      setIsPositioned(true)
    }

    placeTooltip()
    window.addEventListener('resize', placeTooltip)
    window.addEventListener('scroll', placeTooltip, true)

    return () => {
      window.removeEventListener('resize', placeTooltip)
      window.removeEventListener('scroll', placeTooltip, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setIsPositioned(false)
      setTooltipStyle(undefined)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || tooltipRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [open])

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="grid place-items-center rounded-full transition"
        style={{
          color,
          width: size + 8,
          height: size + 8,
          background: open ? bg : 'transparent',
        }}
      >
        <Icon aria-hidden="true" style={{ fontSize: size }} />
      </button>

      {open &&
        createPortal(
          <span
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className="fixed z-50 block max-h-[min(22rem,calc(100vh-2rem))] overflow-y-auto rounded-2xl border border-[var(--c-border)] bg-white p-4 text-sm leading-6 text-[var(--c-text-2)] shadow-[var(--shadow-md)]"
            style={{
              ...tooltipStyle,
              visibility: isPositioned ? 'visible' : 'hidden',
            }}
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  )
}
