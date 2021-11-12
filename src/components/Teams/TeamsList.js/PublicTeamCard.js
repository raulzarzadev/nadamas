import { useAuth } from '@/src/context/AuthContext'
import ButtonJoinTeam from '../ButtonJoinTeam'

export default function PublicTeamCard({ onClick = () => {}, team }) {
  const { user } = useAuth()
  const teamOwner = user.id === team.coach.id
  return (
    <a
      className="bg-gray-600 p-2 rounded-lg shadow-lg w-full relative flex justify-between items-center max-w-lg mx-auto my-2"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onClick(team.id)
      }}
    >
      <div className='w-1/3'> 
        <div className="relative flex pl-3 border-t-2 border-b-2 justify-center rounded-l-sm border-green-400">
          Visitar
        </div>
      </div>
      {/* <div className="w-1/2">
        {!user?.coach && (
          <ButtonJoinTeam
            participantsList={team?.athletes}
            requestList={team?.joinRequests}
            teamId={team?.id}
          />
        )}
        {teamOwner ? (
          <div className="relative flex pl-3 border-t-2 border-b-2 justify-center rounded-l-sm border-green-400">
            PROPIO
          </div>
        ) : (
          <div className="border ">VER</div>
        )}
      </div> */}
      <div>
        <h4 className="text-right">{team.title} </h4>
        <p className="font-extralight text-right">{team.coach.name}</p>
        <p className="font-extralight text-right">
          Miembros activos
          <span className="font-normal"> {team.athletes?.length || '0'}</span>
        </p>
      </div>
    </a>
  )
}
