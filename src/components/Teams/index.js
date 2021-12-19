import { getPublicTeams } from '@/firebase/teams'
import Loading from '@comps/Loading'
import { useEffect, useState } from 'react'
import TeamCard from './TeamsList/TeamCard'

export default function Teams() {
  const [publicTeams, setPublicTeams] = useState(undefined)
  useEffect(() => {
    getPublicTeams()
      .then((res) => setPublicTeams(res))
      .catch((err) => console.log(`err`, err))
    return () => {
      setPublicTeams([])
    }
  }, [])



  if (publicTeams === undefined) return <Loading />

  return (
    <div className="text-center">
      <h3 className="text-2xl py-3">Equipos públicos</h3>
      <div className="grid gap-2">
        {publicTeams?.map((team) => (
          <TeamCard team={team} redirectTeam key={team.id} />
        ))}
      </div>
    </div>
  )
}
