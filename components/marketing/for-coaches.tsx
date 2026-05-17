const BEFORE = [
  'Coordinar por WhatsApp a todas horas',
  'Perseguir pagos y transferencias sueltas',
  'Anotar reservas en mil sitios distintos',
  'Huecos vacíos por avisos de última hora',
]

const AFTER = [
  'Tu agenda publicada, reservas solas',
  'El pago entra al confirmar la clase',
  'Alumnos, horarios y cobros en un lugar',
  'Tu perfil te trae nadadores nuevos',
]

export default function ForCoaches() {
  return (
    <section id="para-coaches" className="relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="reveal grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold"
              style={{ background: 'var(--c-surface)', color: 'var(--c-ocean-mid)' }}
            >
              Para coaches
            </span>
            <h2 className="mt-6 text-[2.1rem] font-extrabold sm:text-[3rem]">
              Deja de coordinar. Dedícate a entrenar.
            </h2>
            <p
              className="mt-5 max-w-[42ch] text-lg leading-relaxed"
              style={{ color: 'var(--c-text-2)' }}
            >
              Si ya das clases, sabes lo que cuesta llenar la agenda y cobrar a
              tiempo. nadamas convierte ese caos en un perfil que trabaja por ti.
              Y pasar la evaluación práctica y teórica te da una credibilidad
              que un anuncio suelto no consigue.
            </p>
            <a
              href="/login"
              className="mt-8 inline-flex items-center justify-center rounded-full px-7 py-4 text-base font-semibold text-white"
              style={{ background: 'var(--c-aqua-strong)', boxShadow: 'var(--shadow-aqua)' }}
            >
              Publicar mi perfil
            </a>
          </div>

          <div className="grid gap-5">
            <div
              className="rounded-[30px] p-8"
              style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
            >
              <p
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: 'var(--c-text-2)' }}
              >
                Hoy, sin nadamas
              </p>
              <ul className="mt-5 space-y-3.5">
                {BEFORE.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-[0.98rem]"
                    style={{ color: 'var(--c-text-2)' }}
                  >
                    <span
                      aria-hidden
                      className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: 'var(--c-text-2)', opacity: 0.5 }}
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="relative overflow-hidden rounded-[30px] p-8"
              style={{ background: 'var(--c-ocean)', boxShadow: 'var(--shadow-md)' }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full opacity-45 blur-2xl"
                style={{ background: 'var(--grad-brand)' }}
              />
              <p
                className="relative text-sm font-semibold uppercase tracking-wide"
                style={{ color: 'var(--c-aqua-light)' }}
              >
                Con nadamas
              </p>
              <ul className="relative mt-5 space-y-3.5">
                {AFTER.map((a) => (
                  <li
                    key={a}
                    className="flex items-start gap-3 text-[0.98rem]"
                    style={{ color: 'color-mix(in oklch, #f8fafc 88%, transparent)' }}
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="mt-0.5 h-5 w-5 shrink-0"
                      fill="none"
                      stroke="var(--c-aqua)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 10.5 8.5 15 16 5.5" />
                    </svg>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
