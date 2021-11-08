import MemberRow from '@comps/Teams/MemberRow'

export default function ParticipantsRows({
  athletesIds,
  handleRemoveMember = (athleteId) => {}
}) {
  console.log(`athletesIds`, athletesIds)
  return (
    <div className="">
      {!athletesIds?.length && 'No hay participantes aún'}
      {athletesIds?.map((athlete) => (
        <MemberRow
          key={athlete}
          athlete={athlete}
          handleRemoveMember={handleRemoveMember}
        />
      ))}
    </div>
  )
}
