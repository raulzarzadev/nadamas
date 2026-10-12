import Link from 'next/link'
import { resources } from '@/lib/marketing/resources'
import { marketingMetadata } from '@/lib/marketing/seo'

export const metadata = marketingMetadata(
  'Recursos para entrenadores y escuelas de natación',
  'Guías y plantillas gratuitas para organizar alumnos, registrar evaluaciones y dar seguimiento al progreso en clases de natación.',
  '/recursos'
)

export default function ResourcesPage() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-sm font-bold uppercase text-(--c-aqua-strong)">
        Aprender, organizar, acompañar
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-extrabold sm:text-5xl">
        Recursos para enseñar natación
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-(--c-text-2)">
        Guías y herramientas prácticas para entrenadores y coordinadores. Empieza con un objetivo
        claro y un registro que te ayude a preparar la siguiente clase.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {resources.map((resource) => (
          <article
            key={resource.slug}
            className="rounded-2xl border border-(--c-border) bg-(--c-surface) p-7"
          >
            <p className="text-sm font-semibold text-(--c-aqua-strong)">{resource.category}</p>
            <h2 className="mt-3 text-2xl font-bold">
              <Link href={`/recursos/${resource.slug}`} className="hover:underline">
                {resource.title}
              </Link>
            </h2>
            <p className="mt-4 leading-relaxed text-(--c-text-2)">{resource.description}</p>
            <Link
              href={`/recursos/${resource.slug}`}
              className="mt-6 inline-flex min-h-11 items-center font-bold text-(--c-aqua-strong)"
            >
              Consultar recurso →
            </Link>
          </article>
        ))}
      </div>
      <aside className="mt-12 border-t border-(--c-border) pt-8">
        <h2 className="text-2xl font-bold">Conecta el seguimiento con tus clases</h2>
        <p className="mt-3 text-(--c-text-2)">
          Conoce cómo Nadamas organiza la agenda, los alumnos y el progreso de tu escuela.
        </p>
        <Link
          href="/software-para-escuelas-de-natacion"
          className="mt-4 inline-flex min-h-11 items-center font-bold text-(--c-aqua-strong)"
        >
          Ver Nadamas para escuelas →
        </Link>
      </aside>
    </section>
  )
}
