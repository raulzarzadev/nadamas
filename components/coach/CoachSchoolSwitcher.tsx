'use client'

import { useEffect, useMemo } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { schoolMembershipHasRole } from '@/lib/school'

export default function CoachSchoolSwitcher() {
  const { schools, selectedId, isPersonal, status, selectSchool, selectPersonal } =
    useSchoolSelection({ includePersonal: true })
  const coachSchools = useMemo(
    () =>
      schools.filter(
        ({ membership }) =>
          membership.status === 'active' && schoolMembershipHasRole(membership, 'teacher')
      ),
    [schools]
  )
  const activeSchoolId =
    !isPersonal && coachSchools.some(({ school }) => school.id === selectedId) ? selectedId : null

  useEffect(() => {
    if (status === 'ready' && !isPersonal && !activeSchoolId) selectPersonal()
  }, [activeSchoolId, isPersonal, selectPersonal, status])

  if (status !== 'ready' || !coachSchools.length) return null

  return (
    <section aria-labelledby="coach-schools-title" className="-mx-1 px-1">
      <p id="coach-schools-title" className="text-sm font-extrabold text-(--c-ocean)">
        Escuelas
      </p>
      <p className="text-[11px] text-(--c-text-2)">
        Escuelas en las que formas parte como entrenador
      </p>
      <nav aria-label="Seleccionar escuela" className="mt-2 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          aria-pressed={isPersonal}
          onClick={selectPersonal}
          className={`min-h-11 shrink-0 rounded-[var(--r-sm)] border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${
            isPersonal
              ? 'border-(--c-ocean) bg-(--c-ocean) text-white shadow-[var(--shadow-sm)]'
              : 'border-(--c-border) bg-white text-(--c-ocean) hover:border-(--c-aqua-strong) hover:bg-(--c-surface)'
          }`}
        >
          Míos
        </button>
        {coachSchools.map(({ school }) => {
          const active = school.id === activeSchoolId
          return (
            <button
              key={school.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectSchool(school.id)}
              className={`min-h-11 shrink-0 rounded-[var(--r-sm)] border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${
                active
                  ? 'border-(--c-ocean) bg-(--c-ocean) text-white shadow-[var(--shadow-sm)]'
                  : 'border-(--c-border) bg-white text-(--c-ocean) hover:border-(--c-aqua-strong) hover:bg-(--c-surface)'
              }`}
            >
              {school.name}
            </button>
          )
        })}
      </nav>
    </section>
  )
}
