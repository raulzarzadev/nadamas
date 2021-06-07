import FormAthlete from '@/src/FormAthlete'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'

export default function grupos() {
  return <PrivateRoute Component={FormAthlete} Layout={MainLayout} />
}
