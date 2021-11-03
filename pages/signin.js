import AuthCard from '@/src/components/AuthCard'
import { Head } from '@/src/components/Head'
import { useAuth } from '@/src/context/AuthContext'
<<<<<<< HEAD
import MainLayout from '@comps/MainLayout'
import { useRouter } from 'next/router'
=======
import router from 'next/router'
>>>>>>> main
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

      <div className="pt-4 md:pt-16">
        <AuthCard />
      </div>
    </>
  )
}
