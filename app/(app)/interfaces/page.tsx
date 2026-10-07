import InterfaceCatalog from '@/components/catalog/InterfaceCatalog'
import AuthGate from '../auth-gate'

export default function InterfacesPage() {
  return (
    <AuthGate>
      <InterfaceCatalog />
    </AuthGate>
  )
}
