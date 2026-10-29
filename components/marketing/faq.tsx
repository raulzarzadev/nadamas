import { NADAMAS_PRICING } from '@/lib/pricing'

export const FAQ_ITEMS = [
  {
    q: '¿Qué es nadamas.app?',
    a: 'Es una app web en español para organizar clases de natación: agenda, reservas, pagos, asistencia y progreso de alumnos. La usan atletas, entrenadores independientes y coordinadores de escuelas.',
  },
  {
    q: '¿Cuánto cuesta nadamas.app?',
    a: `La suscripción cuesta $${NADAMAS_PRICING.regularMonthly} ${NADAMAS_PRICING.currency} al mes por escuela e incluye hasta ${NADAMAS_PRICING.basicLimits.teachers} profes y ${NADAMAS_PRICING.basicLimits.students} alumnos; si necesitas más, te armamos un plan personalizado. Cada propietario puede probar su primera escuela durante ${NADAMAS_PRICING.trialDays} días sin tarjeta. Algunas escuelas seleccionadas reciben un código para pagar $${NADAMAS_PRICING.promotionalMonthly} al mes mientras mantengan activa su suscripción. Las clases de los alumnos se pagan por separado.`,
  },
  {
    q: '¿Necesito descargar algo?',
    a: 'No. nadamas.app funciona desde el navegador del celular o la computadora, y puedes agregarla a la pantalla de inicio para abrirla como una app.',
  },
  {
    q: '¿Puedo usar nadamas sin pertenecer a una escuela?',
    a: 'Sí. Puedes explorar clases como atleta o activar el modo entrenador para gestionar tus propios horarios y alumnos. El modo coordinador es para administrar una escuela.',
  },
  {
    q: '¿Hay clases particulares y grupales?',
    a: 'Sí. Cada entrenador o escuela publica horarios particulares o grupales con su cupo. El atleta elige el horario y ve a quién va a inscribir antes de reservar.',
  },
  {
    q: '¿Cómo se manejan los pagos?',
    a: 'El entrenador o la escuela crea planes o paquetes de clases. El atleta sube su comprobante de pago y la app lleva el saldo y el estado de pago de cada alumno.',
  },
  {
    q: '¿Cómo se registra la asistencia?',
    a: 'Desde la agenda, el entrenador pasa lista al terminar la clase. La escuela puede consultar reportes de asistencia por clase o por alumno.',
  },
  {
    q: '¿Un papá o una mamá puede manejar las clases de varios hijos?',
    a: 'Sí. Con los perfiles adicionales, una sola cuenta administra las reservas, pagos y progreso de varios atletas.',
  },
  {
    q: '¿Qué puede organizar un coordinador?',
    a: 'Puede crear una escuela, invitar entrenadores, gestionar alumnos, asignar horarios, revisar pagos y asistencia, y compartir la página pública de la escuela.',
  },
  {
    q: '¿Mis datos y los de mis alumnos son privados?',
    a: 'Sí. Reservas, pagos, historiales y progreso solo los ven el atleta, su entrenador y su escuela. Lo único público son los perfiles de entrenadores y escuelas que decidan compartirse.',
  },
] as const

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-sm font-bold uppercase text-[#a94732]">Preguntas frecuentes</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl font-extrabold sm:text-4xl">
            Preguntas sobre nadamas.app
          </h2>
        </div>
        <div>
          {FAQ_ITEMS.map((item, index) => (
            <details
              key={item.q}
              className="group border-b border-(--c-border)"
              {...(index === 0 ? { open: true } : {})}
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-base font-bold text-(--c-ocean) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-(--c-surface) text-xl font-normal text-(--c-aqua-strong) transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[58ch] pb-5 leading-relaxed text-(--c-text-2)">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
