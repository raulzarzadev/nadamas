import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import FormResults from '@/legasy/src/components/Events/Results/FormResults'
import { Head } from '@/legasy/src/components/Head'

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
