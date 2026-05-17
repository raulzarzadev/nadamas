export default function BookingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Mis reservas</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: aquí verás tus clases confirmadas y su estado.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Aún no tienes reservas
      </div>
    </div>
  )
}
