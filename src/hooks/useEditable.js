import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function useEditable({ athleteId, coachId=null }) {
  const [isOwner, setIsOwner] = useState(false)
  const [isCoach, setIsCoach] = useState(false)
  const { user } = useAuth()
  useEffect(() => {
    if (user.id === athleteId) setIsOwner(true)
    if (user.id === coachId) setIsCoach(true)
  }, [user])
  return { isOwner, isCoach }
}
