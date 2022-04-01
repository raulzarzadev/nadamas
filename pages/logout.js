import { useUser } from '@/context/UserContext'
import { Head } from '@comps/Head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Signout() {
  const router = useRouter()
  const { logout } = useUser()
  useEffect(() => {
    logout()
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
