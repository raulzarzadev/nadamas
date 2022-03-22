import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import PublicEvents from '@/legasy/src/components/Events/PublicEvents'
import { Head } from '@/legasy/src/components/Head'

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
