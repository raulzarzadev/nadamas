'use client'

import CoachDirectoryList from '@comps/coach/CoachDirectoryList'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'

export default function FindCoachPage() {
  const { selectedId, status } = useSchoolSelection({ includePersonal: true, athleteMode: true })
  const terminology = useSchoolTerminology()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold text-[var(--c-ocean)]">
        Buscar {terminology.schoolId ? terminology.coachSingular : 'coach'}
      </h1>
      {status === 'ready' && (
        <CoachDirectoryList
          key={selectedId || 'personal'}
          schoolId={selectedId}
          coachHrefBase="/athlete/coach"
        />
      )}
    </div>
  )
}
