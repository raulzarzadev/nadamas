import AdminOverviewDashboard from '@/components/admin/AdminOverviewDashboard'
export default function Page() {
  return (
    <div className="grid min-w-0 gap-4">
      <h1 className="text-2xl font-bold">Suscripciones y códigos</h1>
      <AdminOverviewDashboard section="subscription" />
    </div>
  )
}
