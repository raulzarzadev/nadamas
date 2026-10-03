import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'

export default function SchoolNoSelection() {
  return (
    <section
      aria-labelledby="school-setup-title"
      className="mx-auto grid w-full max-w-4xl gap-8 rounded-[var(--r-md)] border border-(--c-border) bg-white p-6 sm:p-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12"
    >
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--c-aqua-strong)">
          Modo director
        </p>
        <h1
          id="school-setup-title"
          className="mt-3 text-2xl font-extrabold text-(--c-ocean) sm:text-3xl"
        >
          Configura tu escuela
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-(--c-text-2)">
          Si coordinas los horarios y las agendas de varios entrenadores y alumnos, este modo es
          para ti.
        </p>
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
            Tu primer paso
          </p>
          <Link
            href="/school/create"
            className="btn btn-primary min-h-11 gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
          >
            Crear escuela
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-(--c-ocean)">Después podrás</h2>
        <ol className="mt-4 space-y-4">
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--c-surface) text-sm font-bold text-(--c-ocean-mid)">
              1
            </span>
            <span>
              <span className="block font-semibold text-(--c-ocean)">Invitar a tu equipo</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-(--c-text-2)">
                Agrega entrenadores y alumnos a tu escuela.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--c-surface) text-sm font-bold text-(--c-ocean-mid)">
              2
            </span>
            <span>
              <span className="block font-semibold text-(--c-ocean)">Organizar los horarios</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-(--c-text-2)">
                Crea clases y asigna entrenadores y alumnos.
              </span>
            </span>
          </li>
        </ol>
      </div>
    </section>
  )
}
