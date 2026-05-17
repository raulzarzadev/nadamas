import AuthGate from '../auth-gate'
import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'

export const metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <RoleGuard need="admin">
        <AppChrome role="admin">{children}</AppChrome>
      </RoleGuard>
    </AuthGate>
  )
}
