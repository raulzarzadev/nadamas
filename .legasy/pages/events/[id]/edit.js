import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import EditEvent from '@/legasy/src/components/Events/EditEvent'
import { Head } from '@/legasy/src/components/Head'

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
