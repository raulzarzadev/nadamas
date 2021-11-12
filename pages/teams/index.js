import PrivateRoute from '@/src/HOCS/PrivateRoute'
import { Head } from '@comps/Head'
import Teams from '@comps/Teams'

export default function TeamsPage() {
  return (
    <>
      <Head title="Equipos " />
      <PrivateRoute mustBeAuthenticated>
        <Teams />
      </PrivateRoute>
    </>
  )
}
