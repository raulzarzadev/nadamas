import PrivateRoute from '@/src/HOCS/PrivateRoute'
import PublicEvents from '@comps/Events/PublicEvents'
import { Head } from '@comps/Head'

export default function Events() {
  
  return (
    <>
      <Head title="Eventos | todos" />
     {/*  <PrivateRoute> */}
        <PublicEvents showGrid={true} showNew={true} />
     {/*  </PrivateRoute> */}
    </>
  )
}
