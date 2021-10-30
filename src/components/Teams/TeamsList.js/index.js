import { getAthlete } from '@/firebase/athletes'
import { getTeams } from '@/firebase/teams'
import { ROUTES } from '@/pages/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import SelectGroupsView from '@comps/SelectGroupsView'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import TeamCard from './TeamCard'

export default function TeamsList() {
  const { user } = useAuth()
  const [teams, setTeams] = useState([])
  const router = useRouter()
  useEffect(() => {
    if (user) {
      getTeams(user?.id, user?.id).then(setTeams)
    }
  }, [user])

  const handleRedirect = (teamId) => {
    router.push(ROUTES.teams.details(teamId))
  }

  return (
    <div className="p-2">
      <SelectGroupsView />
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          onClick={() => handleRedirect(team.id)}
          team={team}
        />
      ))}
    </div>
  )
}
