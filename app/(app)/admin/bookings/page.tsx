import AdminBookings from '@comps/admin/AdminBookings'

export default function AdminBookingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Clases agendadas</h1>
      <p className="text-[var(--c-text-2)]">
        Consulta las reservas confirmadas y canceladas del marketplace.
      </p>
      <AdminBookings />
    </div>
  )
}
