import Groups from '@/legasy/src/components/ViewGroups'
import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import { Head } from '@/legasy/src/components/Head'
export default function grupos() {
  return (
    <>
      <Head title='Grupos '/>
      <PrivateRoute>
        <Groups />
      </PrivateRoute>
    </>
  )
}
