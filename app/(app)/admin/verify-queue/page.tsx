import VerifyQueue from '@comps/admin/VerifyQueue'

export default function VerifyQueuePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Verificaciones</h1>
      <p className="text-[var(--c-text-2)]">
        Revisa las INE enviadas por coaches y valida su identidad.
      </p>
      <VerifyQueue />
    </div>
  )
}
