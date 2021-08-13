import AuthCard from '@/src/components/AuthCard'
import { Head } from '@/src/components/Head'
import { useAuth } from '@/src/context/AuthContext'
import MainLayout from '@/src/layouts/MainLayout'
import router from 'next/router'
import { useEffect } from 'react'

export default function Singin() {
  const { user } = useAuth()
  useEffect(() => {
    if (user) router.push('/')
  }, [user])
  return (
    <>
      <Head title="Ingresar" />
    
      <div className="min-h-screen -mt-24 flex items-center justify-center">
        <AuthCard />
      </div>
    </>
  )
}
