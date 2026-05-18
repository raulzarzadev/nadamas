import CoachProfileGate from '@comps/coach/CoachProfileGate'
import CoachAgenda from '@comps/coach/CoachAgenda'

export default function CoachAgendaPage() {
  return (
    <CoachProfileGate>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Agenda</h1>
        <p className="text-[var(--c-text-2)]">Tus próximas clases agendadas.</p>
        <CoachAgenda />
      </div>
    </CoachProfileGate>
  )
}
