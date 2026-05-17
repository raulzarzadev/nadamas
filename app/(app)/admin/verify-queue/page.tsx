export default function VerifyQueuePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Verificaciones</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: cola de coaches pendientes de evaluación práctica y
        teórica.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Sin solicitudes pendientes
      </div>
    </div>
  )
}
