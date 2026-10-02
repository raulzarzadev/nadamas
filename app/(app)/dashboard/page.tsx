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
  const { roles, activeRole, activeRolePreferenceReady, hasActiveRolePreference } = useRole()

  useEffect(() => {
    if (user === undefined) return

    if (user === null) {
      router.replace('/login?redirectTo=/dashboard')
      return
    }

    if (!activeRolePreferenceReady) return

    const role = hasActiveRolePreference ? activeRole : entryRoleForSession(roles)
    router.replace(destinationForRole(role))
  }, [user, roles, activeRole, activeRolePreferenceReady, hasActiveRolePreference, router])

  return <Loading size="lg" fullScreen />
}
