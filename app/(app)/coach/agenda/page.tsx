import CoachAgenda from '@comps/coach/CoachAgenda'
import CoachProfileGate from '@comps/coach/CoachProfileGate'

export default function CoachAgendaPage() {
  return (
    <CoachProfileGate>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Mis horarios</h1>
        <p className="text-[var(--c-text-2)]">
          Como coach, aquí ves tus horarios publicados y clases agendadas.
        </p>
        <CoachAgenda />
      </div>
    </CoachProfileGate>
  )
}
