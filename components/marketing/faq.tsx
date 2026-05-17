const QA = [
  {
    q: '¿Cómo pago una clase?',
    a: 'Pagas dentro de la app al confirmar tu reserva. El cobro se libera al coach cuando la clase queda confirmada, así no hay transferencias sueltas ni cobros pendientes.',
  },
  {
    q: '¿Puedo cancelar una reserva?',
    a: 'Sí. Cada coach define su ventana de cancelación y la verás antes de reservar. Si cancelas dentro de ese plazo, se gestiona la devolución automáticamente.',
  },
  {
    q: '¿Cómo me hago coach?',
    a: 'Creas tu perfil, añades especialidades, horarios y precios, y nuestro equipo lo revisa a mano antes de publicarlo. Cuando está aprobado, los nadadores ya pueden reservarte.',
  },
  {
    q: '¿Qué tipos de clase hay?',
    a: 'Clases privadas uno a uno y clases de grupo reducido. Cada coach decide qué ofrece, en piscina o aguas abiertas, y con qué enfoque: técnica, triatlón, principiantes o niños.',
  },
  {
    q: '¿Las clases son privadas?',
    a: 'Pueden serlo. Filtras por clases privadas si quieres atención individual, o eliges grupos pequeños si prefieres entrenar acompañado y a mejor precio.',
  },
]

export default function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="reveal lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-[2.1rem] font-extrabold sm:text-[2.9rem]">
            Preguntas frecuentes
          </h2>
          <p className="mt-4 max-w-[34ch] text-lg" style={{ color: 'var(--c-text-2)' }}>
            Lo que la gente suele preguntar antes de reservar su primera clase.
          </p>
        </div>

        <div className="reveal flex flex-col">
          {QA.map((item, i) => (
            <details
              key={item.q}
              className="group border-b"
              style={{ borderColor: 'var(--c-border)' }}
              {...(i === 0 ? { open: true } : {})}
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-semibold [&::-webkit-details-marker]:hidden"
                style={{ color: 'var(--c-ocean)' }}
              >
                {item.q}
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-open:rotate-45"
                  style={{ background: 'var(--c-surface)', color: 'var(--c-aqua-strong)' }}
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                </span>
              </summary>
              <p
                className="max-w-[58ch] pb-6 text-[1.02rem] leading-relaxed"
                style={{ color: 'var(--c-text-2)' }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
