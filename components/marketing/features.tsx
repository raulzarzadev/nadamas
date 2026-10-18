import {
  FiBarChart2,
  FiCalendar,
  FiCheckSquare,
  FiCreditCard,
  FiGlobe,
  FiInbox,
  FiUsers,
} from 'react-icons/fi'
import { MdOutlineBadge } from 'react-icons/md'

export const FEATURES = [
  {
    icon: FiCalendar,
    title: 'Agenda de clases',
    body: 'Publica horarios particulares o grupales, bloquea descansos y mira cupos libres de un vistazo.',
  },
  {
    icon: FiInbox,
    title: 'Reservas y solicitudes',
    body: 'Los atletas reservan o solicitan su lugar; tú confirmas o los agregas directo a la clase.',
  },
  {
    icon: FiCreditCard,
    title: 'Pagos, planes y saldos',
    body: 'Crea paquetes de clases, recibe comprobantes y consulta quién está al corriente.',
  },
  {
    icon: FiCheckSquare,
    title: 'Pase de lista',
    body: 'Registra asistencia en segundos y consulta reportes por clase o por alumno.',
  },
  {
    icon: FiBarChart2,
    title: 'Entrenos y progreso',
    body: 'Guarda el entreno de cada clase, notas y evaluaciones para dar continuidad.',
  },
  {
    icon: FiUsers,
    title: 'Perfiles familiares',
    body: 'Una sola cuenta puede manejar las clases de varios hijos o atletas.',
  },
  {
    icon: MdOutlineBadge,
    title: 'Credencial digital',
    body: 'Cada alumno tiene una credencial con QR, sus planes activos y su próxima clase.',
  },
  {
    icon: FiGlobe,
    title: 'Tu escuela, tu enlace',
    body: 'Escuelas con página propia, logo y colores, más perfiles públicos para compartir.',
  },
] as const

export default function Features() {
  return (
    <section id="funciones" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1180px]">
        <p className="text-sm font-bold uppercase text-[#a94732]">Funciones</p>
        <h2 className="mt-3 max-w-[18ch] text-3xl font-extrabold sm:text-4xl">
          Todo lo que pasa fuera del agua, en orden.
        </h2>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <li
                key={feature.title}
                title={feature.body}
                className="flex flex-col gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 sm:p-6"
              >
                <span className="grid size-11 place-items-center rounded-[var(--r-sm)] bg-(--c-surface)">
                  <Icon aria-hidden="true" className="size-5 text-(--c-aqua-strong)" />
                </span>
                <h3 className="text-base font-bold leading-snug sm:text-lg">{feature.title}</h3>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
