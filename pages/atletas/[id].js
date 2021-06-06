import NewAthlete from '@/src/NewAthlete'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'

export default function grupos() {
  return <PrivateRoute Component={NewAthlete} Layout={MainLayout} />
}
