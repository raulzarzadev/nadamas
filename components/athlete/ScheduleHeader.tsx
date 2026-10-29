'use client'
import AthleteSearchBar from './AthleteSearchBar'

// Coach/school schedule opened from Horarios' search: the pick is shown inside the search
// bar (tap to search again); its X returns to Horarios with the search open on that tab.
export default function ScheduleHeader({
  name,
  searchTab,
  schoolId,
}: {
  name: string
  searchTab: 'coaches' | 'schools'
  schoolId?: string
}) {
  return (
    <>
      <h1 className="sr-only">Horarios de {name}</h1>
      <AthleteSearchBar
        schoolId={schoolId}
        value={name}
        clearHref={`/athlete/schedule/find?search=${searchTab}`}
      />
    </>
  )
}
