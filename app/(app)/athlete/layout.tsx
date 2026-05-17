import AuthGate from '../auth-gate'
import AppChrome from '@comps/app-chrome/AppChrome'

export const metadata = { robots: { index: false, follow: false } }

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <AppChrome role="athlete">{children}</AppChrome>
    </AuthGate>
  )
}
