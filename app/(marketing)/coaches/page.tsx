import CoachDirectoryList from '@comps/coach/CoachDirectoryList'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coaches de natación',
  description:
    'Explora coaches de natación, compara su estilo, revisa horarios publicados y reserva clases con seguimiento de progreso.',
}

export default function CoachesPage() {
  return (
    <section className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <h1 className="text-3xl font-extrabold text-(--c-ocean) sm:text-4xl">Coaches de natación</h1>
      <p className="mt-2 mb-6 text-(--c-text-2)">
        Explora coaches, revisa sus horarios reales y agenda tu clase.
      </p>
      <CoachDirectoryList />
    </section>
  )
}
