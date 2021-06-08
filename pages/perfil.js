import PrivateRoute from '@/src/HOCS/PrivateRoute'
import MainLayout from '@/src/layouts/MainLayout'
import ViewProfile from '@/src/ViewProfile'

export default function grupos() {
  return <PrivateRoute Component={ViewProfile} Layout={MainLayout} />
}
