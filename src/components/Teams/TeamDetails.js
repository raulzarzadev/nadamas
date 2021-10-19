import { getTeam } from '@/firebase/teams'
import { ROUTES } from '@/pages/ROUTES'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import FormTeam from './FormTeam'

export default function TeamDetails() {
  const [team, setTeam] = useState(null)
  const {
    query: { id: teamId },
    replace
  } = useRouter()
  useEffect(() => {
    if (teamId) {
      getTeam(teamId)
        .then((res) => {
          if (res === null) replace(ROUTES.teams.index)
          setTeam(res)
        })
        .catch((err) => console.log('err', err))
    }
  }, [teamId])

  return (
    <div className="">
      <FormTeam team={team} />
    </div>
  )
}
