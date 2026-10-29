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
          Modo coordinador
        </p>
        <h1
          id="school-setup-title"
          className="mt-3 text-2xl font-extrabold text-(--c-ocean) sm:text-3xl"
        >
          Configura tu escuela
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-(--c-text-2)">
          Primero crea tu escuela. Después configura un plan de pago y los horarios de clases. Al
          terminar podrás agregar más profes y alumnos.
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
          {[
            [
              'Configurar un plan de pago',
              'Define los paquetes o mensualidades que ofrecerás a tus alumnos.',
            ],
            ['Crear los horarios de clases', 'Organiza los días, horas y grupos de tu escuela.'],
            ['Agregar profes y alumnos', 'Invita a tu equipo e incorpora alumnos a los horarios.'],
          ].map(([title, description], index) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--c-surface) text-sm font-bold text-(--c-ocean-mid)">
                {index + 2}
              </span>
              <span>
                <span className="block font-semibold text-(--c-ocean)">{title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-(--c-text-2)">
                  {description}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
