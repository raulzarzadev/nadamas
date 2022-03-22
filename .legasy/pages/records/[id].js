import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import { Head } from '@/legasy/src/components/Head'
import ViewRecord from '@/legasy/src/components/ViewRecord'

export default function Record() {
  return (
    <>
      <Head title="Marca | detalles" />
      <PrivateRoute>
        <ViewRecord />
      </PrivateRoute>
    </>
  )
}
