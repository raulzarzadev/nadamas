export const FAQ_ITEMS = [
  {
    q: '¿Puedo usar nadamas sin pertenecer a una escuela?',
    a: 'Sí. Puedes explorar clases como atleta o activar el modo entrenador para gestionar tus propios horarios y alumnos. El modo director es para coordinar una escuela.',
  },
  {
    q: '¿Hay clases particulares y grupales?',
    a: 'Sí. La disponibilidad depende de lo que publique cada entrenador o escuela. Puedes elegir el horario y ver a quién vas a inscribir antes de reservar.',
  },
  {
    q: '¿Quién puede agregar atletas a una clase grupal?',
    a: 'El entrenador o el director de la escuela pueden añadir alumnos a una clase grupal desde su agenda.',
  },
  {
    q: '¿Qué puede organizar un director?',
    a: 'Puede crear una escuela, invitar entrenadores, gestionar alumnos, asignar horarios y administrar las clases y sus participantes.',
  },
  {
    q: '¿Cómo comparto mi perfil o mi escuela?',
    a: 'Desde el modo correspondiente puedes abrir el diálogo de compartir y copiar el enlace público o mostrar su código QR.',
  },
] as const

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-sm font-bold uppercase text-[#a94732]">Preguntas frecuentes</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl font-extrabold sm:text-4xl">
            Antes de entrar al agua.
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
