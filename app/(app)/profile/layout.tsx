'use client'
import AuthGate from '../auth-gate'
import AppChrome from '@comps/app-chrome/AppChrome'
import { useRole } from '@/context/RoleContext'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { activeRole } = useRole()
  return (
    <AuthGate>
      <AppChrome role={activeRole}>{children}</AppChrome>
    </AuthGate>
  )
}
