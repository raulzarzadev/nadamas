import ButtonJoinTeam from '../ButtonJoinTeam'

export default function PublicTeamCard({
  onClick = () => {},
  team
}) {
  return (
    <div
      className="bg-gray-600 p-2 rounded-lg shadow-lg w-full relative flex justify-between items-center max-w-lg mx-auto"
      onClick={(e) => {
        e.preventDefault()
        onClick(team.id)
      }}
    >
      <div className="">
        <ButtonJoinTeam
          participantsList={team?.athletes}
          requestList={team?.joinRequests}
          teamId={team?.id}
        />
      </div>
      <div>
        <h4 className="text-right">{team.title} </h4>
        <p className="font-extralight text-right">{team.coach.name}</p>
        <p className="font-extralight text-left">
          Miembros activos
          <span className="font-normal"> {team.athletes?.length || '0'}</span>
        </p>
      </div>
    </div>
  )
}
