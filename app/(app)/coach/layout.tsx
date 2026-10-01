import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'
import TenantWorkspaceGate from '@/components/school/TenantWorkspaceGate'
import AuthGate from '../auth-gate'

export const metadata = { robots: { index: false, follow: false } }

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <RoleGuard need="coach">
        <AppChrome mode="coach">
          <TenantWorkspaceGate mode="coach">{children}</TenantWorkspaceGate>
        </AppChrome>
      </RoleGuard>
    </AuthGate>
  )
}
