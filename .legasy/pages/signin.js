import AuthCard from '@/legasy/src/components/AuthCard'
import { Head } from '@/legasy/src/components/Head'
import { useAuth } from '@/legasy/src/context/AuthContext'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Singin() {
  const { user } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (user) router.push('/')
  }, [user])
  return (
    <>
      <Head title="Ingresar" />

      <div className="pt-4 md:pt-10 pb-10">
        <AuthCard />
      </div>
    </>
  )
}
