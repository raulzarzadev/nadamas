import WelcomeSetup from '@/components/onboarding/WelcomeSetup'
import AuthGate from '../auth-gate'
export default function WelcomePage() {
  return (
    <AuthGate>
      <WelcomeSetup />
    </AuthGate>
  )
}
