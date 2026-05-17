'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import AuthCard from '@comps/AuthCard'

export default function LoginPage() {
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    if (user) router.push('/dashboard')
  }, [user, router])

  return (
    <div className="py-6">
      <AuthCard />
    </div>
  )
}
