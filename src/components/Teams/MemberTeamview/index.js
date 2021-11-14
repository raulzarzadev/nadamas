import MemberRow from '../MemberRow'

export default function MemberTeamView({ team }) {
  return (
    <div className="">
      Miembros
      {team.athletes?.map((athlete) => (
        <MemberRow key={athlete} athlete={athlete} coachView={false} />
      ))}
    </div>
  )
}
