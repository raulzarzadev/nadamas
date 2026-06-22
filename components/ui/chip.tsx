import type { ReactNode } from 'react'

export default function Chip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--c-border)] bg-[var(--c-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--c-ocean)]">
      {icon && (
        <span aria-hidden="true" className="text-[var(--c-aqua-strong)]">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}
