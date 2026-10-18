'use client'

import { type ReactNode, useEffect, useState } from 'react'
import PaymentStatusBadge from '@/components/payments/PaymentStatusBadge'
import ClassStudentRow from '@/components/ui/class-student-row'
import LabelChip from '@/components/ui/label-chip'
import { getAuthed, getCachedAuthedData } from '@/lib/client/authed-api'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import { normalizeEntitySearch } from '@/lib/entity-matching'
import { localPaymentDate } from '@/lib/payments/engine'
import type { PaymentSnapshot } from '@/lib/payments/model'
import { studentPaymentStatus } from '@/lib/payments/student-status'
import type { SchoolStudent } from '@/lib/school'
import { studentAge, studentPlanSummary } from '@/lib/school-student-table'

export default function SchoolStudentsTable({
  students,
  schoolId,
  timezone,
  canReadPayments,
  labelFilter,
  labels,
  onOpen,
  query,
}: {
  students: SchoolStudent[]
  schoolId: string
  timezone: string
  canReadPayments: boolean
  labelFilter: string[] | null
  labels: (student: SchoolStudent) => ReactNode
  onOpen: (student: SchoolStudent) => void
  /** Search text from the page toolbar (name, email, gender or guardian). */
  query: string
}) {
  const path = `/api/payments?schoolId=${encodeURIComponent(schoolId)}`
  const [payments, setPayments] = useState<PaymentSnapshot | undefined>(() =>
    canReadPayments ? getCachedAuthedData<PaymentSnapshot>(path) : undefined
  )
  const [paymentError, setPaymentError] = useState(false)
  const [revision, setRevision] = useState(0)
  useSchoolAgendaUpdates(schoolId, () => setRevision((value) => value + 1))
  useEffect(() => {
    void revision
    if (!canReadPayments) return
    let active = true
    setPaymentError(false)
    getAuthed(path)
      .then(async (response) => {
        if (!response.ok) throw new Error('STUDENT_PLANS_READ')
        return response.json() as Promise<PaymentSnapshot>
      })
      .then((payload) => {
        if (active) setPayments(payload)
      })
      .catch(() => {
        if (active) setPaymentError(true)
      })
    return () => {
      active = false
    }
  }, [path, canReadPayments, revision])
  const today = localPaymentDate(Date.now(), timezone)
  const normalized = normalizeEntitySearch(query)
  const rows = students
    .filter((student) => !labelFilter || labelFilter.includes(student.id))
    .map((student) => {
      const plan = studentPlanSummary(payments?.accounts[student.id], timezone)
      return {
        student,
        name: student.name,
        email: student.studentEmail || student.guardianEmail || '',
        age: studentAge(student.birthDate, today),
        gender:
          student.gender === 'varonil'
            ? 'Hombre'
            : student.gender === 'femenil'
              ? 'Mujer'
              : 'Sin especificar',
        plan,
        expiresOn: plan.expiresOn,
        remaining: plan.remaining,
      }
    })
    .filter((row) =>
      normalizeEntitySearch(
        `${row.name} ${row.email} ${row.gender} ${row.student.guardianName || ''}`
      ).includes(normalized)
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return (
    <div className="grid min-w-0 gap-3">
      {paymentError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          <p>No pudimos cargar los planes.</p>
          <button
            type="button"
            className="btn btn-outline min-h-11"
            onClick={() => setRevision((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      )}
      {/* Same cards as the coach's student list (CoachAllStudents). */}
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.student.id} className="rounded-xl border border-(--c-border)">
            <ClassStudentRow
              name={row.name}
              labels={
                <>
                  {row.student.additionalProfileId && (
                    <LabelChip
                      label={{ id: 'system-additional', name: 'Adicional', color: 'system-gray' }}
                      size="tiny"
                    />
                  )}
                  {labels(row.student)}
                  <span className="basis-full truncate text-[10px] text-(--c-text-2)">
                    {row.email || 'Sin correo'}
                  </span>
                </>
              }
              actions={
                canReadPayments &&
                payments && (
                  <PaymentStatusBadge
                    status={studentPaymentStatus(payments.accounts[row.student.id], today)}
                  />
                )
              }
              onEdit={() => onOpen(row.student)}
              editLabel={`Abrir perfil de ${row.name}`}
            />
          </li>
        ))}
        {!rows.length && (
          <li role="status" className="py-6 text-center text-sm text-(--c-text-2)">
            No hay atletas que coincidan con tu búsqueda o etiquetas.
          </li>
        )}
      </ul>
    </div>
  )
}
