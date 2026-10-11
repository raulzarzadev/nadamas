'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiDollarSign } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import Sheet from '@/components/ui/sheet'
import { PaymentCRUD } from '@/firebase/payments/main'
import type { PaymentSnapshot } from '@/lib/payments/model'
import PaymentsPanel from './PaymentsPanel'

export default function PaymentBalanceButton() {
  const { selectedId, isPersonal, status } = useSchoolSelection({
    includePersonal: true,
    athleteMode: true,
  })
  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null)
  const [open, setOpen] = useState(false)
  const endpoint =
    selectedId && !isPersonal
      ? `/api/payments?schoolId=${encodeURIComponent(selectedId)}&view=student`
      : ''
  useEffect(() => {
    let active = true
    setSnapshot(null)
    if (endpoint && status === 'ready' && !open)
      PaymentCRUD.get(endpoint)
        .then((data) => {
          if (active) setSnapshot(data)
        })
        .catch(() => {})
    return () => {
      active = false
    }
  }, [endpoint, status, open])
  const student = snapshot?.students[0]
  const content = (
    <>
      <FiDollarSign aria-hidden="true" className="size-4 shrink-0" />
      <span className="hidden sm:inline">Planes y pagos</span>
    </>
  )
  if (!endpoint)
    return (
      <Link
        href="/athlete/payments"
        className="btn btn-outline h-11 min-h-11 w-11 shrink-0 gap-1 px-0! text-xs sm:w-auto sm:px-2!"
        aria-label="Planes y pagos"
        title="Planes y pagos"
      >
        {content}
      </Link>
    )
  return (
    <>
      <button
        type="button"
        className="btn btn-outline h-11 min-h-11 w-11 shrink-0 gap-1 px-0! text-xs sm:w-auto sm:px-2!"
        title="Planes y pagos"
        aria-label={student ? `Planes y pagos de ${student.name}` : 'Planes y pagos'}
        onClick={() => setOpen(true)}
      >
        {content}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Mis pagos" size="xl">
        {open && <PaymentsPanel endpoint={endpoint} initialStudentId={student?.id} />}
      </Sheet>
    </>
  )
}
