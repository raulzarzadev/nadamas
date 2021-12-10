import PrivateRoute from '@/src/HOCS/PrivateRoute'
import { Head } from '@comps/Head'
import TeamDetails from '@comps/Teams/TeamDetails'

export default function Details() {
  return (
    <>
      <Head title="Equipos | detalles" />
      <PrivateRoute >      
        <TeamDetails />
      </PrivateRoute>
    </>
  )
}
