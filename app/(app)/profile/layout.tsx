'use client'
import AppChrome from '@comps/app-chrome/AppChrome'
import { useRole } from '@/context/RoleContext'
import AuthGate from '../auth-gate'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole()
  return (
    <AuthGate>
      <AppChrome mode={activeRole}>{children}</AppChrome>
    </AuthGate>
  )
}
