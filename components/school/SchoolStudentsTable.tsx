'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { FiArrowDown, FiArrowUp, FiClipboard, FiSearch } from 'react-icons/fi'
import LabelChip from '@/components/ui/label-chip'
import { getAuthed, getCachedAuthedData } from '@/lib/client/authed-api'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import { normalizeEntitySearch } from '@/lib/entity-matching'
import { localPaymentDate } from '@/lib/payments/engine'
import type { PaymentSnapshot } from '@/lib/payments/model'
import type { SchoolStudent } from '@/lib/school'
import { studentAge, studentPlanSummary } from '@/lib/school-student-table'

type Column = 'name' | 'email' | 'age' | 'gender' | 'expiresOn' | 'remaining'
const columns: Array<{ key: Column; label: string }> = [
  { key: 'name', label: 'Nombre' },
  { key: 'email', label: 'Correo' },
  { key: 'age', label: 'Edad' },
  { key: 'gender', label: 'Género' },
  { key: 'expiresOn', label: 'Vigencia del plan actual' },
  { key: 'remaining', label: 'Clases pendientes' },
]

export default function SchoolStudentsTable({
  students,
  schoolId,
  timezone,
  canReadPayments,
  labelFilter,
  labels,
  onOpen,
}: {
  students: SchoolStudent[]
  schoolId: string
  timezone: string
  canReadPayments: boolean
  labelFilter: string[] | null
  labels: (student: SchoolStudent) => ReactNode
  onOpen: (student: SchoolStudent) => void
}) {
  const path = `/api/payments?schoolId=${encodeURIComponent(schoolId)}`
  const [payments, setPayments] = useState<PaymentSnapshot | undefined>(() =>
    canReadPayments ? getCachedAuthedData<PaymentSnapshot>(path) : undefined
  )
  const [paymentError, setPaymentError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: Column; ascending: boolean }>({
    key: 'name',
    ascending: true,
  })
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
    .sort((a, b) => {
      const left = a[sort.key],
        right = b[sort.key]
      if (left === null) return right === null ? a.name.localeCompare(b.name, 'es') : 1
      if (right === null) return -1
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), 'es', { numeric: true })
      return (sort.ascending ? order : -order) || a.name.localeCompare(b.name, 'es')
    })
  const unavailable = !canReadPayments
    ? 'No disponible'
    : paymentError
      ? 'No disponible'
      : !payments
        ? 'Cargando…'
        : null
  return (
    <div className="grid min-w-0 gap-3">
      <label className="relative block w-full sm:max-w-md">
        <span className="sr-only">Buscar atletas por nombre o correo</span>
        <FiSearch
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--c-text-2)"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o correo…"
          className="input min-h-11 w-full border-(--c-border) bg-white pl-10"
        />
      </label>
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
      <div className="overflow-x-auto rounded-[var(--r-md)] border border-(--c-border) bg-white shadow-[var(--shadow-sm)]">
        <table className="table w-full text-sm">
          <caption className="sr-only">
            Atletas de la escuela. Usa los encabezados para ordenar las columnas.
          </caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort.key === column.key ? (sort.ascending ? 'ascending' : 'descending') : 'none'
                  }
                >
                  <button
                    type="button"
                    className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded px-1 text-left focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() =>
                      setSort((current) => ({
                        key: column.key,
                        ascending: current.key === column.key ? !current.ascending : true,
                      }))
                    }
                  >
                    {column.label}
                    {sort.key === column.key ? (
                      sort.ascending ? (
                        <FiArrowUp aria-hidden="true" />
                      ) : (
                        <FiArrowDown aria-hidden="true" />
                      )
                    ) : (
                      <span aria-hidden="true" className="text-(--c-text-2)">
                        ↕
                      </span>
                    )}
                  </button>
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">Perfil</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.student.id} className="hover:bg-(--c-surface)">
                <th scope="row" className="min-w-44">
                  <button
                    type="button"
                    onClick={() => onOpen(row.student)}
                    className="min-h-11 text-left font-bold text-(--c-ocean) hover:underline"
                  >
                    {row.name}
                  </button>
                  <div className="flex flex-wrap gap-1">
                    {row.student.additionalProfileId && (
                      <LabelChip
                        label={{ id: 'system-additional', name: 'Adicional', color: 'system-gray' }}
                        size="tiny"
                      />
                    )}
                    {labels(row.student)}
                  </div>
                </th>
                <td>{row.email || 'Sin correo'}</td>
                <td className="whitespace-nowrap">
                  {row.age === null ? 'Sin dato' : `${row.age} ${row.age === 1 ? 'año' : 'años'}`}
                </td>
                <td className="whitespace-nowrap">{row.gender}</td>
                <td className="min-w-44">
                  {unavailable || (
                    <>
                      <span className="block font-semibold">{row.plan.validity}</span>
                      <span className="block text-xs text-(--c-text-2)">
                        {row.plan.name}
                        {row.expiresOn &&
                          ` · ${new Date(`${row.expiresOn}T12:00:00`).toLocaleDateString('es-MX')}`}
                      </span>
                    </>
                  )}
                </td>
                <td>
                  {unavailable ||
                    (row.remaining ?? (row.plan.name === 'Sin plan' ? 'No aplica' : 'Sin límite'))}
                </td>
                <td>
                  <button
                    type="button"
                    aria-label={`Abrir perfil de ${row.name}`}
                    title={`Perfil de ${row.name}`}
                    className="btn btn-outline min-h-11 min-w-11"
                    onClick={() => onOpen(row.student)}
                  >
                    <FiClipboard aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p role="status" className="p-6 text-center text-sm text-(--c-text-2)">
            No hay atletas que coincidan con tu búsqueda o etiquetas.
          </p>
        )}
      </div>
      <p className="text-xs text-(--c-text-2)">
        {rows.length} de {students.length} atletas. Clases pendientes: disponibles del plan,
        descontando usadas y reservadas.
      </p>
    </div>
  )
}
