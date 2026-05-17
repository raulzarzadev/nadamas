import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacidad · nadamas.app',
  description:
    'Cómo nadamas.app trata tus datos: qué guardamos, para qué y tu control sobre tu historial.',
  alternates: { canonical: 'https://nadamas.app/privacidad' },
}

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-[68ch] px-5 py-20 sm:px-8">
      <h1 className="text-3xl font-extrabold" style={{ color: 'var(--c-ocean)' }}>
        Privacidad
      </h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--c-text-2)' }}>
        Última actualización: 16 de mayo de 2026. nadamas.app está en fase
        previa al lanzamiento; esta página resume nuestro enfoque y se ampliará
        antes de la apertura pública.
      </p>

      <div
        className="mt-8 flex flex-col gap-6 text-[1.02rem] leading-relaxed"
        style={{ color: 'var(--c-text-2)' }}
      >
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Qué datos tratamos
          </h2>
          <p className="mt-2">
            Datos de cuenta (nombre, correo), datos de reservas y pagos
            necesarios para prestar el servicio, y tu historial de
            entrenamiento (distancias, tiempos, notas del coach).
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Tu historial es tuyo
          </h2>
          <p className="mt-2">
            Tu historial y preferencias te pertenecen. Tú decides si los
            compartes y con qué coach. Cambiar de entrenador no implica perder
            tu progreso ni exponerlo sin tu consentimiento.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Pagos
          </h2>
          <p className="mt-2">
            Los pagos se procesan mediante proveedores de pago. No almacenamos
            los datos completos de tu tarjeta en nuestros servidores.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Tus derechos
          </h2>
          <p className="mt-2">
            Puedes solicitar acceso, rectificación o eliminación de tus datos
            escribiendo a{' '}
            <a
              href="mailto:hola@nadamas.app"
              className="font-semibold underline"
              style={{ color: 'var(--c-aqua-strong)' }}
            >
              hola@nadamas.app
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
