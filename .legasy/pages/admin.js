import PrivateRoute from '@/legasy/src/HOCS/PrivateRoute'
import AdminDashboard from '@/legasy/src/components/AdminDashboard'

export default function Admin() {
  return (
    <PrivateRoute mustBeAdmin>
      <AdminDashboard/>
    </PrivateRoute>
  )
}
