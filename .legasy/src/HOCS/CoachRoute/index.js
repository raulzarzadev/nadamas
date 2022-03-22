import { useAuth } from '@/legasy/src/context/AuthContext'
import Loading from '@/components/Loading'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PrivateRoute({ children, justOwner }) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (user === null) router.replace('/')
  }, [user])

  if (loading) return <Loading />

  return <>{children}</>
}
