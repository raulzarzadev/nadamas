'use client'

import Loading from '@comps/Loading'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import { destinationForRole, entryRoleForSession } from '@/lib/role-destination'

export default function DashboardEntryPage() {
  const router = useRouter()
  const { user } = useUser()
  const { roles, activeRole } = useRole()

  useEffect(() => {
    if (user === undefined) return

    if (user === null) {
      router.replace('/login?redirectTo=/dashboard')
      return
    }

    router.replace(destinationForRole(entryRoleForSession(roles, activeRole)))
  }, [user, roles, activeRole, router])

  return <Loading size="lg" fullScreen />
}
