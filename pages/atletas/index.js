import Athletes from '@/src/Athletes'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'

export default function grupos() {
  return <PrivateRoute Component={Athletes} Layout={MainLayout} />
}
