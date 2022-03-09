import { getTeamWhereAthleteAlreadyAre } from '@/firebase/teams'
import { ROUTES } from '@/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import Button from '@comps/inputs/Button'
import TeamCard from '@comps/Teams/TeamsList/TeamCard'
import router from 'next/router'
import { useState, useEffect } from 'react'

export default function AthleteTeams({ athleteId }) {
  const [teams, setTeams] = useState([])
  const { user } = useAuth()
  useEffect(() => {
    getTeamWhereAthleteAlreadyAre({ athleteId })
      .then(setTeams)
      .catch((err) => console.log(`err`, err))
    return () => {
      setTeams([])
    }
  }, [])

  return (
    <div>
      <div className="grid grid-flow-row gap-5 px-5 py-2 overflow-auto">
        {teams?.map((team) => (
          <TeamCard redirectTeam team={team} key={team.id} />
        ))}
      </div>
      <div className='pb-2'>
        <Button
          onClick={() => router.push(ROUTES.teams.index)}
          label="Buscar equipo"
          noWrapText
          variant="secondary"
        />
      </div>
    </div>
  )
}
