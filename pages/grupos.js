import Groups from '@/src/ViewGroups'
import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'

export default function grupos() {
  return <PrivateRoute Component={Groups} Layout={MainLayout} />
}
