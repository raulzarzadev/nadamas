import { unjoinTeam } from '@/legasy/firebase/teams'
import useTeams from '@/legasy/src/hooks/useTeams'
import Section from '@/legasy/src/components/Section'
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


  const handleRemoveMember = async (athleteId) => {
    await unjoinTeam(teamId, athleteId)
  }


  return (
    <Section
      title={'Miembros '}
      subtitle={`(${members?.length || 0})`}
      indent={false}
      close
    >
    
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
