import CoachProfileGate from '@comps/coach/CoachProfileGate'

export default function CoachAgendaPage() {
  return (
    <CoachProfileGate>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Agenda</h1>
        <p className="text-[var(--c-text-2)]">
          Próximamente: define clases privadas o de grupo, precios y disponibilidad en tiempo real.
        </p>
        <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
          Calendario en construcción
        </div>
      </div>
    </CoachProfileGate>
  )
}
