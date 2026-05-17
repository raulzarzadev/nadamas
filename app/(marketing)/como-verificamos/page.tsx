import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cómo verificamos a los coaches · nadamas.app',
  description:
    'Cada coach de nadamas.app pasa una evaluación práctica y teórica antes de publicarse. Así sabes con qué profesional entrenas.',
  alternates: { canonical: 'https://nadamas.app/como-verificamos' },
}

export default function ComoVerificamosPage() {
  return (
    <main className="mx-auto max-w-[68ch] px-5 py-20 sm:px-8">
      <h1 className="text-3xl font-extrabold" style={{ color: 'var(--c-ocean)' }}>
        Cómo verificamos a los coaches
      </h1>
      <p
        className="mt-4 text-[1.05rem] leading-relaxed"
        style={{ color: 'var(--c-text-2)' }}
      >
        No publicamos a cualquiera. Cada coach pasa una evaluación en dos
        partes antes de aparecer en nadamas.app, y los nadadores que ya
        entrenaron con él pueden valorarlo.
      </p>

      <div
        className="mt-8 flex flex-col gap-6 text-[1.02rem] leading-relaxed"
        style={{ color: 'var(--c-text-2)' }}
      >
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            1. Evaluación práctica
          </h2>
          <p className="mt-2">
            Revisamos experiencia real en el agua: credenciales, trayectoria y,
            cuando aplica, una sesión de muestra. Queremos saber que sabe
            enseñar, no solo nadar.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            2. Evaluación teórica
          </h2>
          <p className="mt-2">
            Técnica, metodología de entrenamiento y seguridad en el agua. Un
            buen coach entiende el porqué, no solo el qué.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            3. Perfil transparente y valoraciones
          </h2>
          <p className="mt-2">
            Cada perfil describe habilidades y cualidades del coach para que
            sepas qué esperar. Solo los nadadores que tomaron una clase pueden
            dejar una valoración, y puedes leerlas todas antes de reservar.
          </p>
        </section>
      </div>
    </main>
  )
}
