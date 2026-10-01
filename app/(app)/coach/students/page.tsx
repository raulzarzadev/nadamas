import CoachProfileGate from '@comps/coach/CoachProfileGate'
import CoachStudentsWorkspace from '@comps/coach/CoachStudentsWorkspace'
import { Suspense } from 'react'

export default function CoachStudentsPage() {
  return (
    <CoachProfileGate renderChildrenWhenIncomplete showIncompleteNotice={false}>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Alumnos</h1>
        <p className="text-[var(--c-text-2)]">
          Alumnos de la escuela activa o de tus clases personales.
        </p>
        <Suspense fallback={null}>
          <CoachStudentsWorkspace />
        </Suspense>
      </div>
    </CoachProfileGate>
  )
}
