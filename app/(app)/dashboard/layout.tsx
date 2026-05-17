import Layout from '@comps/Layout'
import AuthGate from '../auth-gate'

export const metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <Layout>{children}</Layout>
    </AuthGate>
  )
}
