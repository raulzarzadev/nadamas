import { ROUTES } from '@/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import router from 'next/router'
import { useEffect, useState } from 'react'
import ButtonJoinTeam from '../ButtonJoinTeam'

export default function TeamCard({ redirectTeam, team }) {
  const [teamCoach, setTeamCoach] = useState(false)
  const { user } = useAuth()
  useEffect(() => {
    if (user) setTeamCoach(user?.id === team.coach.id)
  }, [user])

  return (
    <div
      className="bg-primary-light dark:bg-secondary-dark p-2 rounded-lg shadow-lg w-full"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (redirectTeam) {
          router.push(ROUTES.teams.details(team.id))
        }
      }}
    >
      <div className="flex w-full justify-between items-center">
        <div>
          <h4 className="">
            {team.title}{' '}
            <span className="font-thin text-sm">({team.athletes?.length})</span>
            <span className="text-xs font-thin mx-2">
              {team?.publicTeam ? 'Público' : 'Privado'}
            </span>
          </h4>
          <p className="font-extralight ">{team.coach.name} </p>
        </div>
        <div className="w-1/3">
          <ButtonJoinTeam
            participantsList={team?.athletes}
            requestList={team?.joinRequests}
            teamId={team.id}
          />
        </div>
      </div>
      {teamCoach && (
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
