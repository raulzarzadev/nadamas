import CoachProfile from '@/src/components/CoachProfile'
import { Head } from '@/src/components/Head'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
export default function grupos() {
  return (
    <>
     <Head title='Perfil '/>
      <PrivateRoute>
        <CoachProfile />
      </PrivateRoute>
    </>
  )
}
