import type { StudentPaymentStatus } from '@/lib/payments/student-status'

const TONE: Record<StudentPaymentStatus['tone'], string> = {
  none: 'border-(--c-border) bg-white text-(--c-text-2) opacity-60',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  expired: 'border-rose-200 bg-rose-50 text-rose-800',
}

/** "$", "$5", "$ 7d" or "$ -1d" pill next to a student in the coach's list. */
export default function PaymentStatusBadge({ status }: { status: StudentPaymentStatus }) {
  return (
    <span
      title={status.description}
      className={`inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border px-2 text-xs font-bold tabular-nums ${TONE[status.tone]}`}
    >
      <span aria-hidden="true">{status.label}</span>
      <span className="sr-only">Pagos: {status.description}</span>
    </span>
  )
}
