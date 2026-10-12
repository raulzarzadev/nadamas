import Features from '@comps/marketing/features'
import Link from 'next/link'
import { marketingMetadata } from '@/lib/marketing/seo'

export const metadata = marketingMetadata(
  'Software para escuelas y entrenadores de natación',
  'Organiza clases, horarios, alumnos y entrenadores de tu escuela de natación. Guarda notas y evaluaciones para dar continuidad al progreso con Nadamas.',
  '/software-para-escuelas-de-natacion'
)

export default function SwimSchoolSoftwarePage() {
  return (
    <>
      <section className="bg-(--c-surface) px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1180px]">
          <p className="text-sm font-bold uppercase text-(--c-aqua-strong)">
            Nadamas para entrenadores y coordinadores
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold sm:text-6xl">
            Software para escuelas de natación
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-(--c-text-2)">
            Conecta las clases, los alumnos y su progreso. Una agenda para organizar el trabajo de
            tu escuela y dar continuidad a lo que cada entrenador enseña.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-full bg-(--c-ocean) px-6 py-3 font-bold text-white"
            >
              Empezar en Nadamas
            </Link>
            <Link
              href="/precio"
              className="inline-flex min-h-12 items-center rounded-full border border-(--c-border) px-6 py-3 font-bold"
            >
              Consultar precios
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1180px] gap-8 px-5 py-16 sm:px-8 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">
            Menos listas separadas, más contexto para cada clase
          </h2>
          <p className="mt-5 leading-8 text-(--c-text-2)">
            Cuando horarios, grupos y observaciones viven en lugares distintos, preparar una clase
            requiere reunir información una y otra vez. Nadamas conecta esas tareas alrededor de la
            agenda.
          </p>
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold">Para el entrenador independiente</h3>
            <p className="mt-2 leading-relaxed text-(--c-text-2)">
              Publica horarios, organiza sesiones particulares o grupales y conserva notas de tus
              alumnos.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold">Para quien coordina una escuela</h3>
            <p className="mt-2 leading-relaxed text-(--c-text-2)">
              Organiza alumnos, clases y entrenadores para consultar quién participa en cada sesión.
            </p>
          </div>
        </div>
      </section>
      <Features />
      <section className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
        <h2 className="text-3xl font-bold">Empieza con una parte de tu operación</h2>
        <ol className="mt-8 grid list-inside list-decimal gap-6 md:grid-cols-3">
          <li className="rounded-2xl border border-(--c-border) p-6">
            <strong>Accede a tu cuenta.</strong>
            <p className="mt-3 text-(--c-text-2)">
              Ingresa a Nadamas y elige las herramientas que corresponden a tu trabajo.
            </p>
          </li>
          <li className="rounded-2xl border border-(--c-border) p-6">
            <strong>Organiza tus clases.</strong>
            <p className="mt-3 text-(--c-text-2)">
              Comienza con un grupo y revisa horarios, participantes y entrenadores antes de ampliar
              el uso.
            </p>
          </li>
          <li className="rounded-2xl border border-(--c-border) p-6">
            <strong>Continúa el seguimiento.</strong>
            <p className="mt-3 text-(--c-text-2)">
              Guarda notas y evaluaciones para preparar la siguiente sesión con más contexto.
            </p>
          </li>
        </ol>
        <div className="mt-12 border-t border-(--c-border) pt-8">
          <h2 className="text-2xl font-bold">¿Todavía estás definiendo tu forma de trabajar?</h2>
          <p className="mt-3 text-(--c-text-2)">
            Consulta nuestras guías y descarga una plantilla gratuita para registrar el progreso.
          </p>
          <Link
            href="/recursos"
            className="mt-4 inline-flex min-h-11 items-center font-bold text-(--c-aqua-strong)"
          >
            Explorar recursos →
          </Link>
        </div>
        <Link
          href="/login"
          className="mt-8 inline-flex min-h-12 items-center rounded-full bg-(--c-ocean) px-6 py-3 font-bold text-white"
        >
          Empezar en Nadamas
        </Link>
      </section>
    </>
  )
}
