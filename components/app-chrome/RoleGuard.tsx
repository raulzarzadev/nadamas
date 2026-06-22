'use client'
import Loading from '@comps/Loading'
import { notFound, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import type { RoleName } from '@/lib/roles'

export default function RoleGuard({
  need,
  children,
}: {
  need: Extract<RoleName, 'coach' | 'admin'>
  children: React.ReactNode
}) {
  const { user } = useUser() as { user: any }
  const { roles } = useRole()
  const router = useRouter()
  const granted = roles[need]

  useEffect(() => {
    if (user === undefined) return
    if (!granted && need === 'coach') {
      router.replace('/athlete/home')
    }
  }, [user, granted, need, router])

  if (user === undefined) return <Loading />
  if (!granted) {
    if (need === 'admin') notFound()
    return <Loading />
  }
  return <>{children}</>
}
