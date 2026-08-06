import CoachAgenda from '@comps/coach/CoachAgenda'
import { CoachAgendaShareProvider } from '@comps/coach/CoachAgendaShareContext'
import CoachProfileGate from '@comps/coach/CoachProfileGate'
import ShareScheduleButton from '@comps/coach/ShareScheduleButton'

export default function CoachAgendaPage() {
  return (
    <CoachProfileGate renderChildrenWhenIncomplete showIncompleteNotice={false}>
      <CoachAgendaShareProvider>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold sm:text-3xl">Mis horarios</h1>
            <ShareScheduleButton />
          </div>
          <p className="text-[var(--c-text-2)] text-xs">
            Como coach, aquí ves tus horarios publicados y clases agendadas.
          </p>
          <CoachAgenda />
        </div>
      </CoachAgendaShareProvider>
    </CoachProfileGate>
  )
}
