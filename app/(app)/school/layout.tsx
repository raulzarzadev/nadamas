import AppChrome from '@comps/app-chrome/AppChrome'
import TenantWorkspaceGate from '@/components/school/TenantWorkspaceGate'
import SchoolSubscriptionBanner from '@/components/subscriptions/SchoolSubscriptionBanner'
import AuthGate from '../auth-gate'

export const metadata = { robots: { index: false, follow: false } }

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppChrome mode="school">
        <TenantWorkspaceGate mode="school">
          <SchoolSubscriptionBanner />
          {children}
        </TenantWorkspaceGate>
      </AppChrome>
    </AuthGate>
  )
}
