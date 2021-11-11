import PrivateRoute from '@/src/HOCS/PrivateRoute'
import FormEvent from '@comps/Events/FormEvent'
import { Head } from '@comps/Head'

export default function NewEvent() {
  return (
    <>
      <Head title="Eventos | nuevo" />
      <PrivateRoute>
        <FormEvent />
      </PrivateRoute>
    </>
  )
}
