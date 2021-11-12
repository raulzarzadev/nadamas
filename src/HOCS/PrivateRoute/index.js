import { useAuth } from '@/src/context/AuthContext'
import Loading from '@comps/Loading'
import MustBeAuthenticated from '@comps/MainLayout/PageErrors/MustBeAuthenticated'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PrivateRoute({
  Component,
  children,
  mustBeAuthenticated,
  mustBeCoach
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [userData, setUserData] = useState(undefined)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (user) {
      setUserData(user)
      setLoading(false)
    } else {
      // if (user === null) router.replace('/')
    }
  }, [user])

  
  if (!user && mustBeAuthenticated) return <MustBeAuthenticated />
  if(!user?.coach) return <MustBeAuthenticated asCoach/>

  if (loading) return <Loading />

  return <>{children}</>
}
