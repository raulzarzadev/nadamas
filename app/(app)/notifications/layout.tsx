import AppChrome from '@comps/app-chrome/AppChrome'
import AuthGate from '../auth-gate'

export const metadata = { robots: { index: false, follow: false } }

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppChrome>{children}</AppChrome>
    </AuthGate>
  )
}
