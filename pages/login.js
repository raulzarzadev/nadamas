import { useUser } from '@/context/UserContext'
import AuthCard from '@comps/AuthCard'
import { Head } from '@comps/Head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Singin() {
  const { user } = useUser()
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
