import AdminOverviewDashboard from '@/components/admin/AdminOverviewDashboard'
export default function Page() {
  return (
    <div className="grid min-w-0 gap-4">
      <h1 className="text-2xl font-bold">Perfiles adicionales</h1>
      <AdminOverviewDashboard section="profiles" />
    </div>
  )
}
