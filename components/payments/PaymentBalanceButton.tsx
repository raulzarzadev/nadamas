'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiDollarSign } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import Sheet from '@/components/ui/sheet'
import { PaymentCRUD } from '@/firebase/payments/main'
import { localPaymentDate, paymentAvailable } from '@/lib/payments/engine'
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
  const balance =
    student && snapshot
      ? paymentAvailable(
          snapshot.accounts[student.id] || { grants: [] },
          localPaymentDate(Date.now(), snapshot.settings.timezone)
        )
      : null
  const content = (
    <>
      <FiDollarSign aria-hidden="true" />
      {balance === null ? 'Pagos' : `${balance} clases`}
    </>
  )
  if (!endpoint)
    return (
      <Link
        href="/athlete/payments"
        className="btn btn-outline h-8 min-h-8 gap-1 px-2 text-xs"
        aria-label="Mis pagos"
      >
        {content}
      </Link>
    )
  return (
    <>
      <button
        type="button"
        className="btn btn-outline h-8 min-h-8 gap-1 px-2 text-xs"
        aria-label={student ? `Pagos de ${student.name}` : 'Mis pagos'}
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
