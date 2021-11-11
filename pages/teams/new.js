import PrivateRoute from '@/src/HOCS/PrivateRoute'
import { Head } from '@comps/Head'
import FormTeam from '@comps/Teams/FormTeam'

export default function NewTeam() {
  return (
    <>
      <Head title="Equipos | nuevo" />
      <PrivateRoute>
        <FormTeam />
      </PrivateRoute>
    </>
  )
}
