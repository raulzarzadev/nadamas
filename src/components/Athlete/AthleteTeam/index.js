import {
  getPublicTeams,
} from '@/firebase/teams'
import { useAuth } from '@/src/context/AuthContext'
import TeamCard from '@comps/Teams/TeamsList/TeamCard'
import { useState, useEffect } from 'react'

export default function AthleteTeam({athleteId}) {
  const [teams, setTeams] = useState([])
  const { user } = useAuth()
  useEffect(() => {
    getPublicTeams()
      .then(setTeams)
      .catch((err) => console.log(`err`, err))
  }, [])

  return (
    <div className="p-1">
      {teams.map((team) => (
        <TeamCard redirectTeam team={team} />
      ))}
    </div>
  )
}