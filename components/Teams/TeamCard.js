import { useUser } from '@/context/UserContext'
import ButtonJoinTeam from '@comps/Inputs/ButtonJoinTeam'
import router from 'next/router'
import { useEffect, useState } from 'react'

export default function TeamCard({ redirectTeam, team }) {
  const [teamOwner, setTeamOwner] = useState(false)
  const { user } = useUser()
  useEffect(() => {
    if (user)
      // if coach, owner or coach setOwner as true
      setTeamOwner(
        user?.id === team?.coach?.id || user.id === team?.userId || user.isCoach
      )
  }, [user])

  return (
    <div
      className=" bg-base-300 p-2 rounded-lg shadow-lg w-full"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (redirectTeam) {
          router.push(`/teams/${team.id}`)
        }
      }}
    >
      <div className="flex w-full justify-between items-center">
        <div>
          <h4 className="">
            {team?.title || team?.name}{' '}
            <span className="font-thin text-sm">
              ({team.athletes?.length || team?.members?.length || 0})
            </span>
            <span className="text-xs font-thin mx-2">
              {team?.publicTeam ? 'Público' : 'Privado'}
            </span>
            <span className="text-xs font-thin ">
              {teamOwner && ' (Tuyo)'}
            </span>
          </h4>
          <p className="font-extralight ">{team?.coach?.name} </p>
        </div>
        {!teamOwner && (
          <div className="w-1/3">
            <ButtonJoinTeam
              participantsList={team?.athletes}
              requestList={team?.joinRequests}
              teamId={team.id}
            />
          </div>
        )}
      </div>
      {teamOwner && (
        <div>
          <p className="font-extralight text-left">
            Solicitudes pendientes:
            <span className="font-normal">
              {team?.joinRequests?.length || '0'}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
