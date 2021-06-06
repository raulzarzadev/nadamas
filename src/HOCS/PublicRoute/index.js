import { useAuth } from '@/src/context/AuthContext'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PublicRoute({ Component, ...res }) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      router.replace('/')
    }
    if (user === null) return setLoading(false)
  }, [user])

  if (loading) return 'Cargando...'

  return <Component {...res} />
}
