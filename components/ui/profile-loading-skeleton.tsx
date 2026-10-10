export default function ProfileLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando perfil"
      aria-busy="true"
      className="mx-auto grid w-full max-w-5xl gap-5 px-3 py-6 sm:px-4"
    >
      <span className="sr-only">Cargando tu perfil y tus datos…</span>
      <div aria-hidden="true" className="grid gap-5 motion-safe:animate-pulse">
        <div className="flex items-center gap-3">
          <div className="size-11 shrink-0 rounded-full bg-slate-200" />
          <div className="grid flex-1 gap-2">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-100" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-11 rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="h-7 w-40 rounded bg-slate-200" />
        {[0, 1, 2].map((item) => (
          <div key={item} className="grid gap-3 rounded-xl bg-slate-50 p-4">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-12 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
