import { getTeam } from '@/legasy/firebase/teams'
import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import { Head } from '@/legasy/src/components/Head'
import Team from '@/legasy/src/components/Teams/Team'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export default function Details() {
  const [team, setTeam] = useState(undefined)
  const {
    query: { id: teamId }
  } = useRouter()
  useEffect(() => {
    if (teamId) {
      getTeam(teamId, setTeam)
    }
  }, [teamId])

  return (
    <>
      <Head title="Equipos | detalles" />
      <PrivateRoute>
        <Team team={team} />
      </PrivateRoute>
    </>
  )
}
