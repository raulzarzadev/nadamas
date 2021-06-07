import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'
import FormAthlete from '@/src/FormAthlete'

export default function grupos() {
  return <PrivateRoute Component={FormAthlete} Layout={MainLayout} />
}
