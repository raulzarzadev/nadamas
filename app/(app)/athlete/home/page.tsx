import Link from 'next/link'

const CARDS = [
  { href: '/athlete/find-coach', title: 'Buscar coach', body: 'Encuentra coaches verificados por especialidad y disponibilidad.' },
  { href: '/athlete/progress', title: 'Mi progreso', body: 'Tu historial de clases, distancias y notas del coach.' },
  { href: '/athlete/bookings', title: 'Mis reservas', body: 'Próximas clases y reservas confirmadas.' },
]

export default function AthleteHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Hola, nadador</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 hover:shadow-[var(--shadow-md)] transition-shadow"
          >
            <h2 className="text-lg font-bold text-[var(--c-ocean-mid)]">{c.title}</h2>
            <p className="mt-2 text-sm text-[var(--c-text-2)]">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
