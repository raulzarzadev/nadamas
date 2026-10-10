import { Suspense } from 'react'
import PaymentsWorkspace from '@/components/payments/PaymentsWorkspace'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
export default function PaymentsPage() {
  return (
    <Suspense fallback={<ProfileLoadingSkeleton />}>
      <PaymentsWorkspace mode="athlete" />
    </Suspense>
  )
}
