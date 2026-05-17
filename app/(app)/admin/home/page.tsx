import Link from 'next/link'

const CARDS = [
  { href: '/admin/verify-queue', title: 'Verificaciones', body: 'Coaches pendientes de evaluación práctica y teórica.' },
  { href: '/admin/users', title: 'Usuarios', body: 'Listado de usuarios y sus roles.' },
]

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Panel de administración</h1>
      <div className="grid gap-4 sm:grid-cols-2">
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
