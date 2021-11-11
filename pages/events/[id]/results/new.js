import PrivateRoute from '@/src/HOCS/PrivateRoute'
import FormResults from '@comps/Events/Results/FormResults'
import { Head } from '@comps/Head'

export default function NewResults() {
  return (
    <>
      <Head title="Resultados | nuevo" />
      <PrivateRoute>
        <FormResults />
      </PrivateRoute>
    </>
  )
}
