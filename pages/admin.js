import PrivateRoute from '@/src/HOCS/PrivateRoute'
import AdminDashboard from '@comps/AdminDashboard'

export default function Admin() {
  return (
    <PrivateRoute mustBeAdmin>
      <AdminDashboard/>
    </PrivateRoute>
  )
}
