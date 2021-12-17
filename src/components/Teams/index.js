import { getPublicTeams } from '@/firebase/teams'
import { ROUTES } from '@/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import { AddIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import PublicTeamCard from '@comps/Teams/TeamsList/PublicTeamCard'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Teams() {
  const router = useRouter()
  const handleClick = () => {
    router.push(ROUTES.teams.new())
  }
  const [publicTeams, setPublicTeams] = useState(undefined)
  useEffect(() => {
    getPublicTeams()
      .then((res) => setPublicTeams(res))
      .catch((err) => console.log(`err`, err))
    return () => {
      setPublicTeams([])
    }
  }, [])


  const {
    user: { coach }
  } = useAuth()

  if (publicTeams === undefined) return <Loading />

  return (
    <div className="text-center">
      <h3 className="text-2xl py-3">Equipos publicos</h3>
      {coach && (
        <div className="flex w-1/2 mx-auto py-2 justify-center">
          <Button onClick={handleClick} size="xs" fullWidth>
            Nuevo equipo
            <AddIcon size="2rem" />
          </Button>
        </div>
      )}
      {publicTeams?.map((team) => (
        <PublicTeamCard team={team} redirectTeam key={team.id} />
      ))}
    </div>
  )
}
