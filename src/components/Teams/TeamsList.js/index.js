import { getAthlete } from '@/firebase/athletes'
import { getTeams } from '@/firebase/teams'
import { ROUTES } from '@/pages/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import SelectGroupsView from '@comps/SelectGroupsView'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

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
      {teams.map(({ id, title, coach, athletes }) => (
        <button
          key={id}
          className="bg-gray-600 p-2 rounded-lg shadow-lg w-full"
          onClick={() => handleRedirect(id)}
        >
          <h4 className="text-right">
            {title}{' '}
            <span className="font-thin text-sm">({athletes?.length})</span>
          </h4>
          <p className="font-extralight text-right">{coach.name}</p>
          {/*           <Athltetes athletes={athletes} /> */}
        </button>
      ))}
    </div>
  )
}

const Athltetes = ({ athletes }) => {
  const [athleteList, setAthleteList] = useState([])
  useEffect(() => {
    const list = athletes?.map((athleteId) => {
      return getAthlete(athleteId)
    })

    Promise?.all(list).then((res) => {
      setAthleteList(res)
    })
  }, [athletes])
  return (
    <div>
      {athleteList.map(({ id, name, lastName }) => (
        <div key={id}>{`${name || ''} ${lastName || ''}`}</div>
      ))}
    </div>
  )
}
