import { Suspense } from 'react'
import SchoolClassDetails from '@/components/school/SchoolClassDetails'

export default function SchoolClassDetailsPage() {
  return (
    <Suspense fallback={null}>
      <SchoolClassDetails />
    </Suspense>
  )
}
