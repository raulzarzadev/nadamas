import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'
import { redirect } from 'next/navigation'
import { getTenantSchool } from '@/lib/server/tenant-school'
import AuthGate from '../auth-gate'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (await getTenantSchool()) redirect('https://nadamas.app/admin/home')
  return (
    <AuthGate>
      <RoleGuard need="admin">
        <AppChrome mode="admin">{children}</AppChrome>
      </RoleGuard>
    </AuthGate>
  )
}
