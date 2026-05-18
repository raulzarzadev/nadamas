'use client'
import type { ReactNode } from 'react'
import { useId, useState } from 'react'
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
  const { icon: Icon, color, bg } = STYLES[type]

  return (
    <span className="relative inline-flex">
      <button
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

      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-20 block w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--c-border)] bg-white p-4 text-sm leading-6 text-[var(--c-text-2)] shadow-[var(--shadow-md)]"
        >
          {content}
        </span>
      )}
    </span>
  )
}
