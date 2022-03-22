import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import FormRecord from '@/legasy/src/components/FormRecord2'
import { Head } from '@/legasy/src/components/Head'

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
