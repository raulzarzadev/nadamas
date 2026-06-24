import CoachAgenda from '@comps/coach/CoachAgenda'
import CoachProfileGate from '@comps/coach/CoachProfileGate'
import ShareScheduleButton from '@comps/coach/ShareScheduleButton'

export default function CoachAgendaPage() {
  return (
    <CoachProfileGate renderChildrenWhenIncomplete showIncompleteNotice={false}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-extrabold">Mis horarios</h1>
          <ShareScheduleButton />
        </div>
        <p className="text-[var(--c-text-2)] text-xs">
          Como coach, aquí ves tus horarios publicados y clases agendadas.
        </p>
        <CoachAgenda />
      </div>
    </CoachProfileGate>
  )
}
