import { FiBarChart2, FiCalendar, FiClock, FiShare2, FiUserPlus, FiUsers } from 'react-icons/fi'

const FEATURES = [
  {
    icon: FiCalendar,
    title: 'Agenda a la vista',
    body: 'Entrenadores, atletas y escuelas consultan sus clases desde el calendario que corresponde a su modo.',
  },
  {
    icon: FiClock,
    title: 'Horarios disponibles',
    body: 'Publica horarios y consulta espacios libres antes de reservar una clase.',
  },
  {
    icon: FiUsers,
    title: 'Clases grupales y particulares',
    body: 'Organiza sesiones individuales o grupos, con los participantes visibles en cada clase.',
  },
  {
    icon: FiUserPlus,
    title: 'Alumnos en un solo lugar',
    body: 'Añade alumnos, inscríbelos a clases y mantén actualizados los grupos.',
  },
  {
    icon: FiBarChart2,
    title: 'Seguimiento de progreso',
    body: 'Guarda notas y evaluaciones por alumno para continuar el trabajo entre sesiones.',
  },
  {
    icon: FiShare2,
    title: 'Perfiles compartibles',
    body: 'Comparte perfiles públicos y escuelas con un enlace o un código QR.',
  },
] as const

export default function Features() {
  return (
    <section id="funciones" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase text-[#a94732]">En la app</p>
            <h2 className="mt-3 max-w-[18ch] text-3xl font-extrabold sm:text-4xl">
              Lo que ya puedes organizar.
            </h2>
          </div>
          <p className="max-w-[54ch] text-base leading-relaxed text-(--c-text-2) sm:text-lg lg:pt-7">
            Cada modo muestra las herramientas que necesita. Las clases, las personas y el
            seguimiento se conectan alrededor de la misma agenda.
          </p>
        </div>

        <div className="mt-10 grid border-t border-(--c-border) sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="border-b border-(--c-border) py-7 sm:pr-8 lg:py-8"
              >
                <Icon aria-hidden="true" className="size-6 text-(--c-aqua-strong)" />
                <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 max-w-[34ch] leading-relaxed text-(--c-text-2)">
                  {feature.body}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
