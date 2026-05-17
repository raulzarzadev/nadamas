import AuthGate from '../auth-gate'
import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'

export const metadata = { robots: { index: false, follow: false } }

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <RoleGuard need="coach">
        <AppChrome role="coach">{children}</AppChrome>
      </RoleGuard>
    </AuthGate>
  )
}
