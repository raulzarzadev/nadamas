import CoachProfileGate from '@comps/coach/CoachProfileGate'
import CoachStudents from '@comps/coach/CoachStudents'

export default function CoachStudentsPage() {
  return (
    <CoachProfileGate>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Alumnos</h1>
        <p className="text-[var(--c-text-2)]">Personas que ya reservaron clases contigo.</p>
        <CoachStudents />
      </div>
    </CoachProfileGate>
  )
}
