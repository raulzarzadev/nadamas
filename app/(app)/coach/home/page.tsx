import CoachOnboardingBanner from '@comps/coach/CoachOnboardingBanner'
import Link from 'next/link'

const CARDS = [
  {
    href: '/coach/agenda',
    title: 'Agenda',
    body: 'Publica horarios y clases. Tu agenda, tus reglas.',
  },
  {
    href: '/coach/students',
    title: 'Alumnos',
    body: 'Tus nadadores y su progreso en un solo lugar.',
  },
  {
    href: '/coach/coach-profile',
    title: 'Mi perfil de coach',
    body: 'Especialidades, experiencia y verificación.',
  },
]

export default function CoachHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Panel de entrenador</h1>
      <CoachOnboardingBanner />
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
