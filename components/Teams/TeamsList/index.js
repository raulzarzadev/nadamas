import { useUser } from '@/context/UserContext'
import { getUserTeams } from '@/firebase/teams'
import { useEffect, useState } from 'react'
import TeamCard from '../TeamCard'

export default function TeamsList ({ coachId, teams }) {
  const { user } = useUser()
  // const [teams, setTeams] = useState([])
  
  useEffect(() => {
    if (user) {
      let teamList = teams
      getUserTeams(user?.id, user?.id, (teamsSnapshot) => {
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


  return (
    <div className="">
      {/* <SelectGroupsView /> */}
      {teams?.map((team) => (
        <div className="my-2 " key={team.id}>
          <TeamCard redirectTeam team={team} />
        </div>
      ))}
    </div>
  )
}
