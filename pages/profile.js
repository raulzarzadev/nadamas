import { Head } from '@/src/components/Head'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import UserProfile from '@comps/UserProfile'
export default function grupos() {
  return (
    <>
     <Head title='Perfil '/>
      <PrivateRoute>
        <UserProfile />
      </PrivateRoute>
    </>
  )
}
