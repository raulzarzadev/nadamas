import { getPublicTeams } from '@/firebase/teams'
import { ROUTES } from '@/ROUTES'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import { AddIcon } from '@/src/utils/Icons'
import { Head } from '@comps/Head'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import TeamsList from '@comps/Teams/TeamsList.js'
import PublicTeamCard from '@comps/Teams/TeamsList.js/PublicTeamCard'
import TeamCard from '@comps/Teams/TeamsList.js/TeamCard'
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
    <>
      <Head title="Equipos " />
      <PrivateRoute>
        <div className="max-w-md mx-auto">
          <div className="flex w-1/4 mx-auto py-2">
            <Button onClick={handleClick} size="xs">
              Nuevo equipo
              <AddIcon size="3rem" />
            </Button>
          </div>
        </div>
        <h3>Equipos publicos</h3>
        {publicTeams?.map((team) => (
          <PublicTeamCard team={team} onClick={handleClickTeam} key={team.id} />
        ))}

        {/*         <TeamsList /> */}
      </PrivateRoute>
    </>
  )
}
