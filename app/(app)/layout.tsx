import Layout from '@comps/Layout'
import AuthGate from './auth-gate'
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate><Layout>{children}</Layout></AuthGate>
}
