import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import { Head } from '@/legasy/src/components/Head'
import FormTeam from '@/legasy/src/components/Teams/FormTeam'

export default function NewTeam() {
  return (
    <>
      <Head title="Equipos | nuevo" />
      <PrivateRoute mustBeCoach>
        <FormTeam />
      </PrivateRoute>
    </>
  )
}
