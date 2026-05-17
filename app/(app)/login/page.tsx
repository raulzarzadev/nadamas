'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import AuthCard from '@comps/AuthCard'

export default function LoginPage() {
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    if (user) router.push('/athlete/home')
  }, [user, router])

  return (
    <div className="min-h-[calc(100vh-2rem)] px-3 py-6 sm:grid sm:place-items-center sm:py-10">
      <AuthCard />
    </div>
  )
}
