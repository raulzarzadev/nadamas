import MemberRow from '../MemberRow'

export default function MemberTeamView({ team }) {
  console.log(`team`, team)
  return (
    <div className="">
      Miembros
      {team.athletes?.map((athlete) => (
        <MemberRow athlete={athlete} coachView={false}/>
      ))}
    </div>
  )
}
