function Wave() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 40"
      className="h-7 w-16"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
    >
      <path d="M3 24 C 18 6 30 6 45 24 S 72 42 87 24 S 102 6 117 18" />
    </svg>
  )
}

export default function Features() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
      <div className="reveal max-w-[32ch]">
        <h2 className="text-[2.1rem] font-extrabold sm:text-[2.9rem]">
          Pensado para que solo te ocupes de nadar
        </h2>
        <p className="mt-4 text-lg" style={{ color: 'var(--c-text-2)' }}>
          Lo esencial, sin fricción. Reservar y entrenar debería ser lo más fácil.
        </p>
      </div>

      <div className="reveal mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* anchor feature: large, gradient backdrop frame */}
        <div
          className="relative flex flex-col justify-between overflow-hidden rounded-[34px] p-8 sm:p-10 lg:col-span-2 lg:row-span-2"
          style={{ background: 'var(--c-ocean)', boxShadow: 'var(--shadow-md)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-40 blur-2xl"
            style={{ background: 'var(--grad-brand)' }}
          />
          <div className="relative">
            <span style={{ color: 'var(--c-aqua-light)' }}>
              <Wave />
            </span>
            <h3 className="mt-6 text-3xl font-bold" style={{ color: '#f8fafc' }}>
              Reserva en segundos
            </h3>
            <p
              className="mt-4 max-w-[40ch] text-lg leading-relaxed"
              style={{ color: 'color-mix(in oklch, #f8fafc 74%, transparent)' }}
            >
              Eliges coach, ves su agenda real y confirmas tu clase sin esperar
              una respuesta por mensaje. El horario se bloquea al instante.
            </p>
          </div>
          <div
            className="relative mt-10 flex flex-wrap gap-3 text-sm font-medium"
            style={{ color: 'color-mix(in oklch, #f8fafc 80%, transparent)' }}
          >
            {['Confirmación inmediata', 'Sin cadenas de WhatsApp', 'Recordatorios'].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full px-3.5 py-1.5"
                  style={{ background: 'color-mix(in oklch, var(--c-aqua) 20%, transparent)' }}
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>

        <div
          className="rounded-[30px] p-8"
          style={{ background: 'var(--c-surface)', boxShadow: 'var(--shadow-sm)' }}
        >
          <span style={{ color: 'var(--c-aqua)' }}>
            <Wave />
          </span>
          <h3 className="mt-5 text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Coaches verificados
          </h3>
          <p className="mt-3 text-[0.97rem] leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
            Cada perfil se revisa a mano antes de publicarse. Experiencia real,
            reseñas reales.
          </p>
        </div>

        <div
          className="rounded-[30px] p-8"
          style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
        >
          <span style={{ color: 'var(--c-aqua)' }}>
            <Wave />
          </span>
          <h3 className="mt-5 text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Pagos seguros en la app
          </h3>
          <p className="mt-3 text-[0.97rem] leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
            Pagas al reservar, sin transferencias sueltas ni cobros pendientes
            después de clase.
          </p>
        </div>

        {/* wide row: three compact features in one band, varied from the cards above */}
        <div className="grid gap-5 sm:grid-cols-3 lg:col-span-3">
          {[
            {
              t: 'Horarios en tiempo real',
              d: 'La disponibilidad que ves es la que hay. Sin dobles reservas.',
            },
            {
              t: 'Seguimiento de progreso',
              d: 'Cada clase suma a tu historial: distancias, tiempos, notas del coach.',
            },
            {
              t: 'Historial siempre contigo',
              d: 'Tus clases pasadas y próximas, ordenadas en un solo lugar.',
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-[26px] p-7"
              style={{ background: 'var(--c-surface)' }}
            >
              <h3 className="text-lg font-bold" style={{ color: 'var(--c-ocean)' }}>
                {f.t}
              </h3>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
                {f.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
