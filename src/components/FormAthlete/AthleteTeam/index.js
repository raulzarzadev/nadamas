import { getPublicTeams, updateTeam } from '@/firebase/teams'
import { useAuth } from '@/src/context/AuthContext'
import TeamCard from '@comps/Teams/TeamsList.js/TeamCard'
import { useState, useEffect } from 'react'
export default function AthleteTeam() {
  const [teams, setTeams] = useState([])
  const { user } = useAuth()
  useEffect(() => {
    getPublicTeams()
      .then(setTeams)
      .catch((err) => console.log(`err`, err))
  }, [])
  const handleJoin = (id) => {
    if (user.athleteId) {
      setRequestSended([...requestsSended, user.athleteId])
      updateTeam({ id, joinRequests: [user?.athleteId] })
        .then((res) => console.log(`res`, res))
        .catch((err) => console.log(`err`, err))
    }
  }
  const [requestsSended, setRequestSended] = useState([])
  console.log(`teams`, teams)
  return (
    <div className="p-1">
      {teams.map((team) => (
        <div
          key={team.id}
          className="bg-gray-600 p-2 rounded-lg shadow-lg w-full flex items-center justify-between"
        >
          {team?.joinRequests?.includes(user.athleteId) ||
          requestsSended.includes(user.athleteId) ? (
            <div className="border p-1 text-sm"> Esperando respuesta</div>
          ) : (
            <button className="border p-1" onClick={() => handleJoin(team.id)}>
              Solicitar unirse
            </button>
          )}

          <div>
            <h4 className="text-right">
              {team.title}{' '}
              <span className="font-thin text-sm">
                ({team.athletes?.length})
              </span>
            </h4>
            <p className="font-extralight text-right">{team.coach.name}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
