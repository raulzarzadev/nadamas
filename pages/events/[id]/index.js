import PrivateRoute from '@/src/HOCS/PrivateRoute'
import Event from '@comps/Events/Event2'
import { Head } from '@comps/Head'

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
