import UserList from '@comps/admin/UserList'

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Usuarios</h1>
      <p className="text-[var(--c-text-2)]">
        Consulta usuarios y administra sus roles dentro del marketplace.
      </p>
      <UserList />
    </div>
  )
}
