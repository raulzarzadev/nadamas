import CoachRouteAccess from '@/components/coach/CoachRouteAccess'
import AuthGate from '../auth-gate'

export const metadata = { robots: { index: false, follow: false } }

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <CoachRouteAccess>{children}</CoachRouteAccess>
    </AuthGate>
  )
}
