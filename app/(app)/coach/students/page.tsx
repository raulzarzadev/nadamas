import CoachProfileGate from '@comps/coach/CoachProfileGate'
import CoachStudentsWorkspace from '@comps/coach/CoachStudentsWorkspace'
import { Suspense } from 'react'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'

export default function CoachStudentsPage() {
  return (
    <CoachProfileGate renderChildrenWhenIncomplete showIncompleteNotice={false}>
      <Suspense fallback={<ProfileLoadingSkeleton />}>
        <CoachStudentsWorkspace />
      </Suspense>
    </CoachProfileGate>
  )
}
