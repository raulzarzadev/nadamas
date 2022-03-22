import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import Event from '@/legasy/src/components/Events/Event2'
import { Head } from '@/legasy/src/components/Head'

export default function DetailsEvents() {
  return (
    <>
      <Head title="Evento | detalles" />
   {/*    <PrivateRoute> */}
        <Event />
    {/*   </PrivateRoute> */}
    </>
  )
}
