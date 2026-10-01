import AppChrome from '@comps/app-chrome/AppChrome'
import TenantWorkspaceGate from '@/components/school/TenantWorkspaceGate'
import AuthGate from '../auth-gate'

export const metadata = { robots: { index: false, follow: false } }

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppChrome mode="athlete">
        <TenantWorkspaceGate mode="athlete">{children}</TenantWorkspaceGate>
      </AppChrome>
    </AuthGate>
  )
}
