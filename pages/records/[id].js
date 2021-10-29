import PrivateRoute from '@/src/HOCS/PrivateRoute'
import FormRecord from '@comps/FormRecord2'
import { Head } from '@comps/Head'
import ViewRecord from '@comps/ViewRecord'

export default function Record() {
  return (
    <div className="">
      <Head>
        <title>Marca - detalles</title>
      </Head>
      <PrivateRoute>
        <ViewRecord />
      </PrivateRoute>
    </div>
  )
}
