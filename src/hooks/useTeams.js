import { updateTeam } from '@/firebase/teams'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function useTeams({ team }) {
  const { user } = useAuth()
  const editTeam = () => {
    if (user?.limits?.teams >= 1) updateTeam(team)
  }
  const [teamOwner, setTeamOwner] = useState(false)
  useEffect(() => {
    setTeamOwner(team?.userId === user?.id)
  }, [user, team])

  const [teamMember, setTeamMember] = useState(false)

  console.log(team)
  useEffect(() => {
    if (
      team?.athletes.includes(user?.athleteId) ||
      team?.coaches?.includes(user.athleteId)
    )
      setTeamMember(true)
  }, [user, team])

  return { editTeam, teamOwner, teamMember }
}
