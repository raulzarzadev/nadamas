import { useAuth } from '@/src/context/AuthContext'
import MainLayout from '@/src/layouts/MainLayout'
import router from 'next/router'
import { useEffect } from 'react'

export default function Signout() {
  const { signOut } = useAuth()
  useEffect(() => {
    signOut()
    setTimeout(() => {
      router.push('/')
    }, 500)
  }, [])
  return (
    <MainLayout>
      <div className="h-screen -mt-16 flex justify-center items-center">
        <h3 className="text-3xl">Adiós</h3>
      </div>
    </MainLayout>
  )
}
