import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'
import AuthGate from '../auth-gate'

export const metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <RoleGuard need="admin">
        <AppChrome mode="admin">{children}</AppChrome>
      </RoleGuard>
    </AuthGate>
  )
}
