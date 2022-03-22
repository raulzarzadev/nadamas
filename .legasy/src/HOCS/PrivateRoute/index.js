import { useAuth } from '@/legasy/src/context/AuthContext'
import Loading from '@/components/Loading'
import MustBeAuthenticated from '@/legasy/src/components/MainLayout/PageErrors/MustBeAuthenticated'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PrivateRoute({
  Component,
  children,
  mustBeAuthenticated = false,
  mustBeCoach,
  mustBeAdmin
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (user) {
      setLoading(false)
    } else {
      if (user === null) router.replace('/')
    }
  }, [user])

  if (!user && mustBeAuthenticated) return <MustBeAuthenticated />
  if (!user?.coach && mustBeCoach) return <MustBeAuthenticated as="coach" />
  if (!user?.admin && mustBeAdmin) return <MustBeAuthenticated as="admin" />

  if (loading) return <Loading />

  return <>{children}</>
}
