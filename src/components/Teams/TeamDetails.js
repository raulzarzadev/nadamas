import { getTeam } from '@/firebase/teams'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import FormTeam from './FormTeam'

export default function TeamDetails() {
  const [team, setTeam] = useState({})
  const {
    query: { id: teamId }
  } = useRouter()
  console.log(teamId)
  useEffect(() => {
    if (teamId) {
      getTeam(teamId).then(setTeam)
    }
  }, [teamId])
  return (
    <div className="">
      <FormTeam team={team} />
    </div>
  )
}
