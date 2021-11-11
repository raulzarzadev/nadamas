import PrivateRoute from '@/src/HOCS/PrivateRoute'
import EditEvent from '@comps/Events/EditEvent'
import { Head } from '@comps/Head'

export default function EventEdit() {
  return (
    <>
      <Head title="Evento | editar" />
      <PrivateRoute>
        <EditEvent />
      </PrivateRoute>
    </>
  )
}
