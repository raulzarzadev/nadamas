'use client'
import { FiChevronRight } from 'react-icons/fi'
import { formatPlanDate } from '@/lib/payments/format'
import type { PaymentAccount, PaymentGrant, PaymentStudent } from '@/lib/payments/model'

type Row = { key: string; student: string; grant: PaymentGrant; detail: string; sortAt: string }

function PlanRows({ rows, muted }: { rows: Row[]; muted?: boolean }) {
  if (!rows.length)
    return <p className="px-1 py-2 text-sm text-(--c-text-2)">No hay planes aquí.</p>
  return (
    <ul className={`grid gap-2 ${muted ? 'opacity-80' : ''}`}>
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center gap-3 rounded-xl border border-(--c-border) bg-white px-3 py-2"
        >
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-sm font-semibold text-(--c-ocean)">{row.student}</span>
            <span className="truncate text-xs text-(--c-text-2)">{row.grant.product.name}</span>
          </span>
          <span className="shrink-0 text-right text-xs text-(--c-text-2)">{row.detail}</span>
        </li>
      ))}
    </ul>
  )
}

function Section({
  title,
  rows,
  muted,
  defaultOpen,
}: {
  title: string
  rows: Row[]
  muted?: boolean
  defaultOpen?: boolean
}) {
  return (
    <details className="group grid gap-2" open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-bold text-(--c-ocean) [&::-webkit-details-marker]:hidden">
        <FiChevronRight
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-90"
        />
        {title} ({rows.length})
      </summary>
      <PlanRows rows={rows} muted={muted} />
    </details>
  )
}

/** Coach "Mis cobros" footer: students' current plans, then finished (expired or used up) ones. */
export default function StudentPlansSummary({
  students,
  accounts,
  today,
}: {
  students: PaymentStudent[]
  accounts: Record<string, PaymentAccount>
  today: string
}) {
  const current: Row[] = []
  const finished: Row[] = []
  for (const student of students) {
    for (const grant of accounts[student.id]?.grants || []) {
      if (grant.startsOn > today) continue
      const expired = Boolean(grant.endsBefore && today >= grant.endsBefore)
      const left = grant.product.classes - grant.used - grant.reserved
      const usedUp = grant.product.mode === 'classes' && left <= 0
      const row: Row = {
        key: `${student.id}:${grant.id}`,
        student: student.name,
        grant,
        sortAt: grant.endsBefore || grant.startsOn,
        detail: expired
          ? `Venció ${formatPlanDate(grant.endsBefore as string)}`
          : usedUp
            ? 'Agotado'
            : [
                grant.product.mode === 'classes'
                  ? `${left} ${left === 1 ? 'clase' : 'clases'}`
                  : 'Vigente',
                grant.endsBefore && `vence ${formatPlanDate(grant.endsBefore)}`,
              ]
                .filter(Boolean)
                .join(' · '),
      }
      ;(expired || usedUp ? finished : current).push(row)
    }
  }
  current.sort((a, b) => a.sortAt.localeCompare(b.sortAt))
  finished.sort((a, b) => b.sortAt.localeCompare(a.sortAt))
  return (
    <div className="grid gap-1 border-t border-(--c-border) pt-3">
      <Section title="Planes vigentes" rows={current} defaultOpen />
      <Section title="Planes finalizados" rows={finished} muted />
    </div>
  )
}
