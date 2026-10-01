import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'
import AuthGate from '../auth-gate'

export const metadata = { robots: { index: false, follow: false } }

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <RoleGuard need="coach">
        <AppChrome mode="coach">{children}</AppChrome>
      </RoleGuard>
    </AuthGate>
  )
}
