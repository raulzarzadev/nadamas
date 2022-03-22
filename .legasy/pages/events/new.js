import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import FormEvent from '@/legasy/src/components/Events/FormEvent'
import { Head } from '@/legasy/src/components/Head'

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
