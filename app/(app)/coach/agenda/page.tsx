import { CoachAgendaShareProvider } from '@comps/coach/CoachAgendaShareContext'
import CoachAgendaWorkspace from '@comps/coach/CoachAgendaWorkspace'
import CoachProfileGate from '@comps/coach/CoachProfileGate'

export default function CoachAgendaPage() {
  return (
    <CoachProfileGate renderChildrenWhenIncomplete showIncompleteNotice={false}>
      <CoachAgendaShareProvider>
        <CoachAgendaWorkspace />
      </CoachAgendaShareProvider>
    </CoachProfileGate>
  )
}
