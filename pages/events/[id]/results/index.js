import PrivateRoute from '@/src/HOCS/PrivateRoute'
import Results from '@comps/Events/Results'
import { Head } from '@comps/Head'

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
