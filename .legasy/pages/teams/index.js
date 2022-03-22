import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import { Head } from '@/legasy/src/components/Head'
import Teams from '@/legasy/src/components/Teams'

export default function TeamsPage() {
  return (
    <>
      <Head title="Equipos " />
    {/*   <PrivateRoute mustBeAuthenticated> */}
        <Teams />
     {/*  </PrivateRoute> */}
    </>
  )
}
