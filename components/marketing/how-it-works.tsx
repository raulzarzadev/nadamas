import Image from 'next/image'
import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'

const JOURNEYS = [
  {
    id: 'atletas',
    number: '01',
    audience: 'Para atletas',
    title: 'Encuentra tu clase y sigue avanzando.',
    intro:
      'Consulta opciones para entrenar, elige un horario disponible y lleva tus clases en tu propia agenda.',
    steps: [
      { title: 'Explora entrenadores y escuelas' },
      { title: 'Reserva tu lugar' },
      { title: 'Mira tu progreso' },
    ],
    action: 'Explorar entrenadores',
    href: '/coaches',
    tone: 'white',
    image: '/recursos/modo-alumno.png',
    imageAlt: 'Guía del modo atleta de nadamas.app',
    photo: '/images/landing/instructora-clase-nino.webp',
    photoAlt:
      'Nanda Paz, instructora de natación, dando clase a una niña con tabla en el mar al atardecer',
    credit: {
      name: 'Nanda Paz',
      role: 'Instructora de natación en aguas abiertas',
      href: 'https://nandapaz.com',
      label: 'nandapaz.com',
    },
  },
  {
    id: 'entrenadores',
    number: '02',
    audience: 'Para entrenadores',
    title: 'Una agenda clara para enseñar mejor.',
    intro:
      'Gestiona tus horarios, clases y alumnos desde tu propio espacio, trabajes por tu cuenta o con una escuela.',
    steps: [
      { title: 'Organiza tus horarios' },
      { title: 'Gestiona alumnos y pagos' },
      { title: 'Pasa lista y registra avances' },
    ],
    action: 'Empezar como entrenador',
    href: '/login?redirectTo=%2Fcoach%2Factivate',
    tone: 'mint',
    image: '/recursos/modo-entrenador.png',
    imageAlt:
      'Guía del modo entrenador: agenda de clases con horarios ocupados, abiertos y bloqueados',
    photo: '/images/landing/entrenador-cronometro.webp',
    photoAlt:
      'Abdon Marín, entrenador de natación, con cronómetro y tabla de anotaciones durante un entrenamiento',
    credit: {
      name: 'Abdon Marín',
      role: 'Entrenador de natación, atletismo y triatlón',
      href: 'https://abdon.mx',
      label: 'abdon.mx',
    },
  },
  {
    id: 'directores',
    number: '03',
    audience: 'Para coordinadores de escuelas',
    title: 'Coordina a todo tu equipo desde un lugar.',
    intro:
      'Crea tu escuela y administra las agendas de varios entrenadores y atletas sin perder de vista cada clase.',
    steps: [
      { title: 'Crea tu escuela' },
      { title: 'Invita a tus entrenadores' },
      { title: 'Administra clases, asistencia y pagos' },
    ],
    action: 'Crear una escuela',
    href: '/login?redirectTo=%2Fschool%2Fcreate',
    tone: 'dark',
    image: '/recursos/modo-coordinador.png',
    imageAlt: 'Guía del modo coordinador para administrar una escuela de natación',
    photo: null,
    photoAlt: '',
    credit: null,
  },
] as const

export default function HowItWorks() {
  return (
    <>
      <section id="como-funciona" className="scroll-mt-20 px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-[1180px]">
          <p className="text-sm font-bold uppercase text-[#a94732]">Cómo funciona</p>
          <h2 className="mt-3 max-w-[18ch] text-3xl font-extrabold sm:text-4xl">
            Un espacio para cada forma de vivir la natación.
          </h2>
        </div>
      </section>

      {JOURNEYS.map((journey) => {
        const dark = journey.tone === 'dark'
        const background =
          journey.tone === 'dark' ? 'var(--c-ocean)' : journey.tone === 'mint' ? '#e8f5f2' : '#fff'
        const text = dark ? '#fff' : 'var(--c-ocean)'
        const secondary = dark ? 'rgba(255,255,255,0.78)' : 'var(--c-text-2)'
        const border = dark ? 'rgba(255,255,255,0.22)' : 'var(--c-border)'

        return (
          <section
            key={journey.id}
            id={journey.id}
            className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
            style={{ background, color: text }}
          >
            <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
              <div>
                <p
                  className="text-sm font-bold uppercase"
                  style={{ color: dark ? '#9ceaf0' : '#a94732' }}
                >
                  {journey.number} / {journey.audience}
                </p>
                <h2
                  className="mt-4 max-w-[18ch] text-3xl font-extrabold sm:text-4xl"
                  style={{ color: text }}
                >
                  {journey.title}
                </h2>
                <p
                  className="mt-5 max-w-[48ch] text-base leading-relaxed sm:text-lg"
                  style={{ color: secondary }}
                >
                  {journey.intro}
                </p>

                <ol className="mt-8">
                  {journey.steps.map((step, index) => (
                    <li
                      key={step.title}
                      className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-4 border-t py-3.5 sm:grid-cols-[3rem_minmax(0,1fr)]"
                      style={{ borderColor: border }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: dark ? '#9ceaf0' : '#a94732' }}
                      >
                        0{index + 1}
                      </span>
                      <h3 className="text-lg font-bold" style={{ color: text }}>
                        {step.title}
                      </h3>
                    </li>
                  ))}
                </ol>

                <Link
                  href={journey.href}
                  className="mt-6 inline-flex min-h-11 items-center gap-2 border-b pb-1 font-bold transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
                  style={{ color: text, borderColor: text }}
                >
                  {journey.action}
                  <FiArrowRight aria-hidden="true" />
                </Link>
              </div>

              {journey.photo ? (
                // Real photo first, with the mode guide layered on top as an inset.
                <div className="reveal relative mx-auto w-full max-w-[400px] pb-24 pl-10 sm:pl-16">
                  <Image
                    src={journey.photo}
                    alt={journey.photoAlt}
                    width={960}
                    height={1280}
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 60vw, 80vw"
                    className="w-full rounded-[var(--r-lg)] object-cover shadow-[var(--shadow-lg)]"
                  />
                  <Image
                    src={journey.image}
                    alt={journey.imageAlt}
                    width={2160}
                    height={2700}
                    sizes="(min-width: 1024px) 210px, 45vw"
                    className="absolute bottom-0 left-0 w-[46%] rounded-[var(--r-md)] shadow-[var(--shadow-lg)] ring-4 ring-white"
                  />
                  {journey.credit && (
                    <p className="absolute right-0 bottom-0 w-[50%] text-right text-xs leading-snug sm:text-sm">
                      <span className="block font-bold" style={{ color: text }}>
                        {journey.credit.name}
                      </span>
                      <span className="block" style={{ color: secondary }}>
                        {journey.credit.role}
                      </span>
                      <a
                        href={journey.credit.href}
                        target="_blank"
                        rel="noopener"
                        className="mt-1 inline-flex min-h-8 items-center font-bold text-(--c-aqua-strong) underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
                      >
                        {journey.credit.label}
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <Image
                  src={journey.image}
                  alt={journey.imageAlt}
                  width={2160}
                  height={2700}
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 70vw, 92vw"
                  className="reveal mx-auto w-full max-w-[400px] rounded-[var(--r-lg)] shadow-[var(--shadow-lg)]"
                />
              )}
            </div>
          </section>
        )
      })}
    </>
  )
}
