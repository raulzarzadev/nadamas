import PrivateRoute from '@/src/HOCS/PrivateRoute'
import { Head } from '@comps/Head'
import ViewRecord from '@comps/ViewRecord'

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
