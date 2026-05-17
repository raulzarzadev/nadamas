'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function LogoutPage() {
  const router = useRouter()
  const { logout } = useUser()

  useEffect(() => {
    logout()
    router.push('/')
  }, [logout, router])

  return <div className="py-6 text-center">Cerrando sesión…</div>
}
