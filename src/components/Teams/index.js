import { getPublicTeams } from '@/firebase/teams'
import { ROUTES } from '@/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import { AddIcon } from '@/src/utils/Icons'
import { Head } from '@comps/Head'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import MustBeAuthenticated from '@comps/MainLayout/PageErrors/MustBeAuthenticated'
import PublicTeamCard from '@comps/Teams/TeamsList.js/PublicTeamCard'
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
  const handleClickTeam = (id) => {
    router.push(`${ROUTES.teams.details(id)}`)
  }

  if (publicTeams === undefined) return <Loading />

  return (
    <div className="text-center">
      <h3 className='text-2xl py-3'>Equipos publicos</h3>
      <div className="max-w-md mx-auto mb-4">
        <div className="flex w-1/2 mx-auto py-2">
          <Button onClick={handleClick} size="xs" >
            Nuevo equipo
            <AddIcon size="2rem" />
          </Button>
        </div>
      </div>
      {publicTeams?.map((team) => (
        <PublicTeamCard team={team} onClick={handleClickTeam} key={team.id} />
      ))}
    </div>
  )
}
