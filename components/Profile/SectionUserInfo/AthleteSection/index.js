import RecordsSection from '@comps/Records/RecordsSection'

export default function AthleteSection({ userId, canCreateNewRecord }) {
  return (
    <RecordsSection userId={userId} canCreateNewRecord={canCreateNewRecord} />
  )
}
