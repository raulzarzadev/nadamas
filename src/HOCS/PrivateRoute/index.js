import { useAuth } from '@/src/context/AuthContext'
import Loading from '@comps/Loading'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PrivateRoute({ Component, children, ...res }) {
  const router = useRouter()
  const { user } = useAuth()
  const [userData, setUserData] = useState(undefined)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (user) {
      setUserData(user)
      setLoading(false)
    } else {
      if (user === null) router.replace('/')
    }
  }, [user])

  if (loading) return <Loading />

  return <>{children}</>
}
