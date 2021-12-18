
import { unjoinTeam } from '@/firebase/teams'
import MemberRow from './MemberRow'

export default function TeamMembers({
  members = [],
  teamId,
  coachView,
  teamCoaches
}) {

  const handleRemoveMember = async (athleteId) => {
    await unjoinTeam(teamId, athleteId)
  }

  return (
    <>
     
      Entrenadores
      <div className=" max-w-md mx-auto">
        {teamCoaches?.map((memberId, i) => (
          <MemberRow
            teamId={teamId}
            teamCoaches={teamCoaches}
            key={memberId}
            athlete={memberId}
            handleRemoveMember={handleRemoveMember}
            coachView={coachView}
          />
        ))}
      </div>
      Integrantes
      <div className=" max-w-md mx-auto">
        {members?.map((memberId, i) => (
          <MemberRow
            teamId={teamId}
            teamCoaches={teamCoaches}
            key={memberId}
            athlete={memberId}
            handleRemoveMember={handleRemoveMember}
            coachView={coachView}
          />
        ))}
      </div>
    </>
  )
}

const AthleteResponse = ({ athlete, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="my-2"
    >{`${athlete.name} ${athlete.lastName}`}</div>
  )
}
