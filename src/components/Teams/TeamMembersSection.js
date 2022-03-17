import { unjoinTeam } from '@/firebase/teams'
import useTeams from '@/src/hooks/useTeams'
import AthleteRow from '@comps/AthleteRow'
import Section from '@comps/Section'
import AddMyOwnTeamMembers from './AddMyOwnTeamMembers'
import MemberRow from './MemberRow'

export default function TeamMembersSection({
  /*   members = [],
  teamId,
  teamCoaches,
  coachView, */
  team
}) {
  const { teamOwner } = useTeams({ team })
  const teamId = team?.id
  const coachView = teamOwner
  const teamCoaches = team?.coaches
  const members = team?.athletes

  console.log(team)

  const handleRemoveMember = async (athleteId) => {
    await unjoinTeam(teamId, athleteId)
  }

  console.log('team.coach', team.coach)

  return (
    <Section
      title={'Miembros '}
      subtitle={`(${members?.length || 0})`}
      indent={false}
      close
    >
      {/*  {coachView && <AddMyOwnTeamMembers teamId={teamId} />} */}
      Entrenador
      <div className=" max-w-md mx-auto">
        <MemberRow
          teamId={teamId}
          teamCoaches={teamCoaches}
          athlete={team?.coach?.id}
          // key={memberId}
          // handleRemoveMember={handleRemoveMember}
          coachView={coachView}
        />
        {/* {teamCoaches?.map((memberId, i) => (
          <MemberRow
            teamId={teamId}
            teamCoaches={teamCoaches}
            key={memberId}
            athlete={memberId}
            handleRemoveMember={handleRemoveMember}
            coachView={coachView}
          />
        ))} */}
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
    </Section>
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
