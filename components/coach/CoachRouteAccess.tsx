'use client'

import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'
import { usePathname } from 'next/navigation'
import TenantWorkspaceGate from '@/components/school/TenantWorkspaceGate'

export default function CoachRouteAccess({ children }: { children: React.ReactNode }) {
  const activationRoute = usePathname() === '/coach/activate'

  if (activationRoute) return <AppChrome mode="coach">{children}</AppChrome>

  return (
    <RoleGuard need="coach">
      <AppChrome mode="coach">
        <TenantWorkspaceGate mode="coach">{children}</TenantWorkspaceGate>
      </AppChrome>
    </RoleGuard>
  )
}
