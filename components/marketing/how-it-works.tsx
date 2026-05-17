const SWIMMER = [
  {
    n: '01',
    title: 'Encuentra tu coach',
    body: 'Filtra por especialidad, ubicación y precio. Cada perfil con experiencia, reseñas y disponibilidad real.',
  },
  {
    n: '02',
    title: 'Reserva tu horario',
    body: 'Eliges el hueco que te queda bien y pagas en la app. Sin cadenas de mensajes ni transferencias sueltas.',
  },
  {
    n: '03',
    title: 'Entrena y mejora',
    body: 'Entrenas con un profesional y tu progreso te sigue: si cambias de coach, no empiezas de cero.',
  },
]

const COACH = [
  {
    n: '01',
    title: 'Publica tus horarios',
    body: 'Defines clases privadas o de grupo, precios y disponibilidad. Tu agenda, tus reglas.',
  },
  {
    n: '02',
    title: 'Recibe reservas',
    body: 'Los nadadores te encuentran y reservan solos. Tú dedicas el tiempo a entrenar, no a coordinar.',
  },
  {
    n: '03',
    title: 'Cobra automático',
    body: 'El pago entra en la app al confirmar la clase. Menos fricción, menos cobros pendientes.',
  },
]

function Track({
  kind,
  steps,
}: {
  kind: 'swimmer' | 'coach'
  steps: typeof SWIMMER
}) {
  const isCoach = kind === 'coach'
  return (
    <div
      className="reveal rounded-[34px] p-8 sm:p-10"
      style={{
        background: isCoach ? 'var(--c-ocean)' : 'var(--c-surface)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <span
        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold"
        style={{
          background: isCoach
            ? 'color-mix(in oklch, var(--c-aqua) 22%, transparent)'
            : 'var(--c-bg)',
          color: isCoach ? 'var(--c-aqua-light)' : 'var(--c-ocean-mid)',
        }}
      >
        {isCoach ? 'Si eres coach' : 'Si quieres aprender'}
      </span>

      <h3
        className="mt-5 text-2xl font-bold sm:text-[1.7rem]"
        style={{ color: isCoach ? '#f8fafc' : 'var(--c-ocean)' }}
      >
        {isCoach
          ? 'Tu negocio de entrenamiento, ordenado.'
          : 'De buscar a nadar, en tres pasos.'}
      </h3>

      <ol className="mt-8 space-y-7">
        {steps.map((s, i) => (
          <li key={s.n} className="flex gap-5">
            <div className="flex flex-col items-center">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  background: isCoach
                    ? 'color-mix(in oklch, var(--c-aqua) 18%, transparent)'
                    : 'var(--c-bg)',
                  color: isCoach ? 'var(--c-aqua-light)' : 'var(--c-aqua)',
                }}
              >
                {s.n}
              </span>
              {i < steps.length - 1 && (
                <span
                  className="mt-2 w-px flex-1"
                  style={{
                    background: isCoach
                      ? 'color-mix(in oklch, var(--c-aqua-light) 24%, transparent)'
                      : 'var(--c-border)',
                  }}
                />
              )}
            </div>
            <div className="pb-1">
              <p
                className="text-lg font-semibold"
                style={{ color: isCoach ? '#f8fafc' : 'var(--c-ocean)' }}
              >
                {s.title}
              </p>
              <p
                className="mt-1.5 max-w-[42ch] text-[0.97rem] leading-relaxed"
                style={{
                  color: isCoach
                    ? 'color-mix(in oklch, #f8fafc 72%, transparent)'
                    : 'var(--c-text-2)',
                }}
              >
                {s.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
      <div className="reveal max-w-[30ch]">
        <h2 className="text-[2.1rem] font-extrabold sm:text-[2.9rem]">
          Cómo funciona
        </h2>
        <p className="mt-4 text-lg" style={{ color: 'var(--c-text-2)' }}>
          Dos caminos, una sola app. Tú eliges desde dónde entras.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-7">
        <Track kind="swimmer" steps={SWIMMER} />
        <Track kind="coach" steps={COACH} />
      </div>
    </section>
  )
}
