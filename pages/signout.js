import { Head } from '@/src/components/Head'
import { useAuth } from '@/src/context/AuthContext'
import MainLayout from '@comps/MainLayout'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Signout() {
  const router = useRouter()
  const { signOut } = useAuth()
  useEffect(() => {
    signOut()
    setTimeout(() => {
      router.push('/')
    }, 500)
  }, [])
  return (
    <>
      <Head title="Salir" />
      <div className="h-screen -mt-16 flex justify-center items-center">
        <h3 className="text-3xl">Adiós</h3>
      </div>
    </>
  )
}
