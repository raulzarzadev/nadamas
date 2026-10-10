import AdminOverviewDashboard from '@comps/admin/AdminOverviewDashboard'

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Panel de administración</h1>
      <AdminOverviewDashboard />
    </div>
  )
}
