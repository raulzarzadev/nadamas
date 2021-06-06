import { useAuth } from '@/src/context/AuthContext'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PrivateRoute({ Component, Layout, ...res }) {
  const router = useRouter()
  const { user } = useAuth()
  const [userData, setUserData] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setUserData(user)
      setLoading(false)
    } else {
      router.replace('/')
    }
  }, [user])
  

  if (loading) return 'Cargando ...'

  return (
    <Layout user={user}>
      <Component {...res} user={userData} />
    </Layout>
  )
}
