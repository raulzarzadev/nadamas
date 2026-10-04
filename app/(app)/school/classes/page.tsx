import SchoolClasses from '@comps/school/SchoolClasses'
import { Suspense } from 'react'

export default function SchoolClassesPage() {
  return (
    <Suspense fallback={null}>
      <SchoolClasses />
    </Suspense>
  )
}
