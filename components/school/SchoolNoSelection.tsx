import Link from 'next/link'

export default function SchoolNoSelection() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-start gap-3 rounded-[var(--r-md)] border border-(--c-border) bg-white p-6 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--c-aqua-strong)">
        Modo escuela
      </p>
      <h1 className="text-2xl font-extrabold text-(--c-ocean)">Configura tu escuela</h1>
      <p className="text-sm text-(--c-text-2)">
        Para administrar horarios y participantes, primero crea una escuela.
      </p>
      <Link
        href="/school/create"
        className="btn btn-primary mt-2 min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
      >
        Crear escuela
      </Link>
    </section>
  )
}
