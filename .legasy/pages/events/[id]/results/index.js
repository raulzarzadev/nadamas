import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import Results from '@/legasy/src/components/Events/Results'
import { Head } from '@/legasy/src/components/Head'

export default function EventResults() {
  return (
    <>
      <Head title="Resultados | todos" />
      <PrivateRoute>
        <Results />
      </PrivateRoute>
    </>
  )
}
