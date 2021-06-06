import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'
import NewAthlete from '@/src/NewAthlete'

export default function grupos() {
  return <PrivateRoute Component={NewAthlete} Layout={MainLayout} />
}
