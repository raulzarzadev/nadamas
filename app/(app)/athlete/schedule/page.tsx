'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import AthleteBookingsOverview from '@/components/athlete/AthleteBookingsOverview'
import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import { useTenantSchool } from '@/context/TenantSchoolContext'

// Horarios: the athlete's own upcoming classes; "Buscar más horarios" opens the search sheet
// on its Horarios tab (available hours) without leaving the page.
export default function AthleteSchedulePage() {
  const tenant = useTenantSchool()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchOpen, setSearchOpen] = useState(false)
  // Old links (?search=, ?schoolId=) meant the search view.
  useEffect(() => {
    if (searchParams.has('search') || searchParams.has('schoolId'))
      router.replace(`/athlete/schedule/find?${searchParams}`)
  }, [searchParams, router])

  return (
    <div className="flex flex-col gap-4">
      <AthleteBookingsOverview view="upcoming" inline />
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setSearchOpen(true)}
        className="btn btn-primary min-h-12 w-full gap-2 rounded-full sm:w-fit sm:self-center sm:px-8"
      >
        <FiSearch aria-hidden="true" />
        Buscar más horarios
      </button>
      <AthleteSearchBar
        schoolId={tenant?.id}
        defaultTab="schedules"
        open={searchOpen}
        onOpenChange={setSearchOpen}
        hideTrigger
      />
    </div>
  )
}
