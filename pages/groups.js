import Groups from '@comps/ViewGroups'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import { Head } from '@/src/components/Head'
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
