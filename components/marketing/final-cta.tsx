export default function FinalCta() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 pb-24 pt-4 sm:px-8 lg:pb-32">
      <div
        className="reveal relative overflow-hidden rounded-[44px] px-7 py-20 text-center sm:px-12 lg:py-28"
        style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-lg)' }}
      >
        <svg
          aria-hidden
          className="ribbon-drift pointer-events-none absolute inset-x-0 bottom-0 w-[140%] opacity-[0.22]"
          viewBox="0 0 1440 240"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 150 C 260 70 520 220 760 140 C 1000 60 1220 200 1440 130 L 1440 240 L 0 240 Z"
            fill="#f8fafc"
          />
        </svg>

        <div className="relative mx-auto max-w-[24ch]">
          <h2
            className="text-[2.3rem] font-extrabold leading-[1.05] sm:text-[3.4rem]"
            style={{ color: '#f8fafc' }}
          >
            Nada mejor. Con el coach indicado.
          </h2>
        </div>
        <p
          className="relative mx-auto mt-6 max-w-[46ch] text-lg leading-relaxed"
          style={{ color: 'color-mix(in oklch, #f8fafc 82%, transparent)' }}
        >
          Tu próxima clase puede empezar hoy. Encuentra a quien te lleve más
          lejos en el agua, sin vueltas.
        </p>

        <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#coaches"
            className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold"
            style={{
              background: '#f8fafc',
              color: 'var(--c-ocean)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            Encontrar coach
          </a>
          <a
            href="/login?intent=coach"
            className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold"
            style={{
              color: '#f8fafc',
              border: '1px solid color-mix(in oklch, #f8fafc 45%, transparent)',
            }}
          >
            Publicar mi perfil
          </a>
        </div>
      </div>
    </section>
  )
}
