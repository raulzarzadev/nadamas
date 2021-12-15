import { getTeams } from '@/firebase/teams'
import { ROUTES } from '@/ROUTES'
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
      let teamList = teams
      getTeams(user?.id, user?.id, (teamsSnapshot) => {
        // si no existe en teams agregalo, si existe modificalo}
        teamsSnapshot.forEach((snap) => {
          const cleaned = teamList.filter(({ id }) => snap.id !== id)
          teamList = [...cleaned, snap]
        })
        setTeams(teamList)
      })
    }
    ()=>{
      setTeams([])
    }
  }, [user])
  console.log(`teams`, teams)

  const handleRedirect = (teamId) => {
    router.push(ROUTES.teams.details(teamId))
  }

  return (
    <div className="">
      {/* <SelectGroupsView /> */}
      {teams?.map((team) => (
        <div className="my-2 " key={team.id}>
          <TeamCard onClick={() => handleRedirect(team.id)} team={team} />
        </div>
      ))}
    </div>
  )
}
