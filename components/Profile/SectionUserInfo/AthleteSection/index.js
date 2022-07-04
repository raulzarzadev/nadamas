import RecordsSection from '@comps/Records/RecordsSection'

export default function AthleteSection({ athleteId, canCreateNewRecord }) {
  return (
    <RecordsSection athleteId={athleteId} canCreateNewRecord={canCreateNewRecord} />
  )
}
