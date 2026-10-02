import CoachProfileGate from '@comps/coach/CoachProfileGate'
import CoachStudentsWorkspace from '@comps/coach/CoachStudentsWorkspace'
import { Suspense } from 'react'

export default function CoachStudentsPage() {
  return (
    <CoachProfileGate renderChildrenWhenIncomplete showIncompleteNotice={false}>
      <Suspense fallback={null}>
        <CoachStudentsWorkspace />
      </Suspense>
    </CoachProfileGate>
  )
}
