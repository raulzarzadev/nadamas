import MemberRow from '../MemberRow'
import TeamMembers from '../TeamMembers'

export default function MemberTeamView({ team }) {
  return (
    <div className="">
      <TeamMembers
        coachView={false}
        teamCoaches={team?.coaches}
        teamId={team.id}
        members={team?.athletes}
      />
    </div>
  )
}
