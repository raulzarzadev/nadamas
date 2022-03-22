import { Head } from '@/legasy/src/components/Head'
import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import UserProfile from '@/legasy/src/components/UserProfile'
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
