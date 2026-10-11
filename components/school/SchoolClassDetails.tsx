'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FiArrowLeft } from 'react-icons/fi'
import ClassDetailsSection from '@/components/coach/ClassDetailsSection'
import { schoolMembershipHasRole } from '@/lib/school'
import { useSchoolSelection } from './useSchoolSelection'

type Selection = {
  coachId: string
  date: string
  startTime: string
  groupType: 'particular' | 'grupal'
}

function parseSelections(value: string | null): Selection[] {
  try {
    const values: unknown = JSON.parse(value || '[]')
    if (!Array.isArray(values) || values.length > 100) return []
    const seen = new Set<string>()
    return values
      .filter((item): item is Selection => {
        if (
          !item ||
          typeof item !== 'object' ||
          typeof item.coachId !== 'string' ||
          !item.coachId ||
          item.coachId.includes('/') ||
          item.coachId.length > 128 ||
          typeof item.date !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
          !Number.isFinite(new Date(`${item.date}T12:00:00`).getTime()) ||
          typeof item.startTime !== 'string' ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime) ||
          !['particular', 'grupal'].includes(item.groupType)
        )
          return false
        const key = `${item.date}|${item.startTime}|${item.coachId}|${item.groupType}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  } catch {
    return []
  }
}

export default function SchoolClassDetails() {
  const params = useSearchParams()
  const { schools, status } = useSchoolSelection()
  const schoolId = params.get('schoolId') || ''
  const slots = parseSelections(params.get('slots'))
  const schoolAccess = schools.find(({ school }) => school.id === schoolId)
  const canManage = schoolMembershipHasRole(schoolAccess?.membership, 'teacher')
  const groups = new Map<string, Selection[]>()
  for (const slot of slots) {
    const key = `${slot.date}|${slot.startTime}`
    groups.set(key, [...(groups.get(key) || []), slot])
  }
  const validSchool = schoolId && schoolId.length <= 128 && !schoolId.includes('/')
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-2 px-3 py-1 sm:px-2 sm:py-1">
      <Link
        href={`/school/classes${validSchool ? `?school=${encodeURIComponent(schoolId)}` : ''}`}
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean)"
      >
        <FiArrowLeft aria-hidden="true" />
        Volver a horarios
      </Link>
      {status === 'loading' ? (
        <p role="status" className="text-sm">
          Cargando clases…
        </p>
      ) : !schoolAccess ? (
        <p className="text-sm text-(--c-text-2)">No tienes acceso a esta escuela.</p>
      ) : !validSchool || !slots.length ? (
        <p className="text-sm text-(--c-text-2)">
          Selecciona horarios en la agenda para consultar sus detalles.
        </p>
      ) : (
        [...groups.entries()].map(([key, group]) => (
          <ClassDetailsSection key={key} slots={group} schoolId={schoolId} canManage={canManage} />
        ))
      )}
    </main>
  )
}
