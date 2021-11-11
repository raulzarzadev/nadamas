import PrivateRoute from '@/src/HOCS/PrivateRoute'
import FormRecord from '@comps/FormRecord2'
import { Head } from '@comps/Head'

export default function newRecord() {
  return (
    <div>
      <Head title='Marcas | nueva'/>
      <PrivateRoute>
        <FormRecord searchAthlete/>
      </PrivateRoute>
    </div>
  )
}
