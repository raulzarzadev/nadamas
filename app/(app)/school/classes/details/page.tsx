import { Suspense } from 'react'
import SchoolClassDetails from '@/components/school/SchoolClassDetails'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'

export default function SchoolClassDetailsPage() {
  return (
    <Suspense fallback={<ProfileLoadingSkeleton />}>
      <SchoolClassDetails />
    </Suspense>
  )
}
