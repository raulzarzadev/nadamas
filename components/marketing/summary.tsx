// Short pitch: meta/OG description (keep under ~160 chars).
export const PITCH_TEXT =
  'nadamas.app es donde atletas, entrenadores y dueños de clubes organizan sus entrenamientos, planes y equipos, para que tú solo te enfoques en entrenar.'

// Self-contained factual definition for search engines and AI assistants
// (llms.txt + JSON-LD only; not rendered on the page).
export const SUMMARY_TEXT =
  'nadamas.app es una app web en español para organizar clases de natación. Los entrenadores publican horarios y gestionan alumnos, pagos y progreso; los atletas reservan clases y consultan su avance; y los coordinadores administran una escuela completa con varios entrenadores.'

const SLOTS = [
  { time: '07:00', title: 'Ana R.', kind: 'Particular', status: 'Ocupado', tone: 'busy' },
  {
    time: '08:00',
    title: 'Grupo técnica',
    kind: 'Grupal · 4 de 6',
    status: 'Abierto',
    tone: 'open',
  },
  { time: '17:00', title: 'Horario libre', kind: 'Particular', status: 'Disponible', tone: 'open' },
  {
    time: '18:00',
    title: 'Descanso',
    kind: 'No recibe reservas',
    status: 'Bloqueado',
    tone: 'blocked',
  },
] as const

const TONES = {
  busy: { bg: '#fdecea', bar: '#c0392b', text: '#a8321f' },
  open: { bg: '#e6f5ec', bar: '#1f8a4c', text: '#17693a' },
  blocked: { bg: '#e8f0fb', bar: '#2f6db5', text: '#245a99' },
} as const

export default function Summary() {
  return (
    <section
      id="que-es"
      aria-labelledby="que-es-title"
      className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <div>
          <p className="text-sm font-bold uppercase text-[#a94732]">En resumen</p>
          <h2 id="que-es-title" className="mt-3 max-w-[20ch] text-3xl font-extrabold sm:text-4xl">
            ¿Qué es nadamas.app?
          </h2>
          <p className="mt-5 max-w-[48ch] text-xl font-semibold leading-relaxed">
            Es la forma en que atletas, entrenadores y dueños de clubes mantienen organizados sus
            entrenamientos, planes y equipos.
          </p>
          <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-(--c-text-2)">
            Un punto de encuentro en línea para tu equipo, siempre al día, con herramientas pensadas
            para que tú solo te enfoques en entrenar.
          </p>
        </div>

        <figure className="reveal mx-auto w-full max-w-md">
          <div className="rounded-[var(--r-lg)] bg-white p-5 shadow-[var(--shadow-lg)] ring-1 ring-(--c-border) sm:p-6">
            <div className="flex items-baseline justify-between">
              <p className="font-[family-name:var(--font-display)] text-lg font-extrabold">
                Mis horarios
              </p>
              <p className="text-sm text-(--c-text-2)">Martes</p>
            </div>
            <ul className="mt-4 space-y-2.5">
              {SLOTS.map((slot) => {
                const tone = TONES[slot.tone]
                return (
                  <li
                    key={slot.time}
                    className="flex items-center gap-4 rounded-[var(--r-sm)] border-l-4 px-4 py-3"
                    style={{ background: tone.bg, borderColor: tone.bar }}
                  >
                    <span className="w-12 shrink-0 font-extrabold tabular-nums">{slot.time}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{slot.title}</span>
                      <span className="block truncate text-xs text-(--c-text-2)">{slot.kind}</span>
                    </span>
                    <span
                      className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold"
                      style={{ color: tone.text }}
                    >
                      {slot.status}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
          <figcaption className="mt-4 text-center text-sm text-(--c-text-2)">
            Vista de agenda del modo entrenador.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
