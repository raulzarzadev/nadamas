import SchoolClasses from '@comps/school/SchoolClasses'
import { Suspense } from 'react'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'

export default function SchoolClassesPage() {
  return (
    <Suspense fallback={<ProfileLoadingSkeleton />}>
      <SchoolClasses />
    </Suspense>
  )
}
