import { ROUTES } from '@/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function TeamCard({ redirectTeam, team }) {
  const router = useRouter()
  const { user } = useAuth()
  const [teamCoach, setTeamCoach] = useState(false)
  useEffect(() => {
    setTeamCoach(user?.id === team.coach.id)
  }, [user])

  return (
    <button
      className="bg-primary-light dark:bg-secondary-dark p-2 rounded-lg shadow-lg w-full"
      onClick={(e) => {
        e.preventDefault()
        if (redirectTeam) {
          router.push(ROUTES.teams.details(team.id))
        }
      }}
    >
      <h4 className="text-right">
        {team.title}{' '}
        <span className="font-thin text-sm">({team.athletes?.length})</span>
      </h4>
      <p className="font-extralight text-right">{team.coach.name}</p>
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
    </button>
  )
}
