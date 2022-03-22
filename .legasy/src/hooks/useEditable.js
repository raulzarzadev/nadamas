import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function useEditable({ userId, coachId = null }) {
  const [isOwner, setIsOwner] = useState(false)
  const [isCoach, setIsCoach] = useState(false)
  const { user } = useAuth()
  useEffect(() => {
    if (userId) {
      if (user?.id === userId) setIsOwner(true)
      if (user?.id === coachId) setIsCoach(true)
    }
  }, [userId])
  return { isOwner, isCoach }
}
