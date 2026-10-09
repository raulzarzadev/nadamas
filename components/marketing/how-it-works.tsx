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
      {
        title: 'Explora entrenadores y escuelas',
        body: 'Revisa perfiles públicos y horarios antes de elegir una clase.',
      },
      {
        title: 'Reserva tu lugar',
        body: 'Inscríbete en una clase particular o grupal según la disponibilidad publicada.',
      },
      {
        title: 'Mira tu progreso',
        body: 'Consulta tus próximas clases y el seguimiento que registra tu entrenador.',
      },
    ],
    action: 'Explorar entrenadores',
    href: '/coaches',
    tone: 'white',
  },
  {
    id: 'entrenadores',
    number: '02',
    audience: 'Para entrenadores',
    title: 'Una agenda clara para enseñar mejor.',
    intro:
      'Gestiona tus horarios, clases y alumnos desde tu propio espacio, trabajes por tu cuenta o con una escuela.',
    steps: [
      {
        title: 'Organiza tus horarios',
        body: 'Define disponibilidad y prepara clases particulares o grupales.',
      },
      {
        title: 'Gestiona a tus alumnos',
        body: 'Añade participantes a tus clases y consulta quién estará en cada sesión.',
      },
      {
        title: 'Registra avances',
        body: 'Guarda notas y evaluaciones para dar continuidad al entrenamiento.',
      },
    ],
    action: 'Empezar como entrenador',
    href: '/login?redirectTo=%2Fcoach%2Factivate',
    tone: 'mint',
  },
  {
    id: 'directores',
    number: '03',
    audience: 'Para coordinadores de escuelas',
    title: 'Coordina a todo tu equipo desde un lugar.',
    intro:
      'Crea tu escuela y administra las agendas de varios entrenadores y atletas sin perder de vista cada clase.',
    steps: [
      {
        title: 'Crea tu escuela',
        body: 'Configura el espacio desde el que se organizan tus clases.',
      },
      {
        title: 'Invita a tus entrenadores',
        body: 'Forma tu equipo y asigna horarios a cada entrenador.',
      },
      {
        title: 'Administra clases y participantes',
        body: 'Consulta la agenda, gestiona alumnos y completa los grupos.',
      },
    ],
    action: 'Crear una escuela',
    href: '/login?redirectTo=%2Fschool%2Fcreate',
    tone: 'dark',
  },
] as const

export default function HowItWorks() {
  return (
    <>
      <section id="como-funciona" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20">
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
            <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
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
                  className="mt-5 max-w-[44ch] text-base leading-relaxed sm:text-lg"
                  style={{ color: secondary }}
                >
                  {journey.intro}
                </p>
                <Link
                  href={journey.href}
                  className="mt-7 inline-flex min-h-11 items-center gap-2 border-b pb-1 font-bold transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
                  style={{ color: text, borderColor: text }}
                >
                  {journey.action}
                  <FiArrowRight aria-hidden="true" />
                </Link>
              </div>

              <ol>
                {journey.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-t py-5 first:pt-6 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-5"
                    style={{ borderColor: border }}
                  >
                    <span
                      className="pt-1 text-sm font-bold"
                      style={{ color: dark ? '#9ceaf0' : '#a94732' }}
                    >
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: text }}>
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-[45ch] leading-relaxed" style={{ color: secondary }}>
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )
      })}
    </>
  )
}
