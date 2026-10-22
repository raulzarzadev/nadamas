import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description:
    'Términos de uso de nadamas.app: marketplace para reservar coaches de natación.',
  alternates: { canonical: 'https://nadamas.app/terminos' },
}

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-[68ch] px-5 py-20 sm:px-8">
      <h1 className="text-3xl font-extrabold" style={{ color: 'var(--c-ocean)' }}>
        Términos y condiciones
      </h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--c-text-2)' }}>
        Última actualización: 16 de mayo de 2026. Producto en fase previa al
        lanzamiento; estos términos se ampliarán antes de la apertura pública.
      </p>

      <div
        className="mt-8 flex flex-col gap-6 text-[1.02rem] leading-relaxed"
        style={{ color: 'var(--c-text-2)' }}
      >
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            El servicio
          </h2>
          <p className="mt-2">
            nadamas.app conecta a nadadores con coaches de natación. Facilitamos
            el descubrimiento, la reserva y el pago de clases. La clase la
            presta el coach, no nadamas.app.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Coaches
          </h2>
          <p className="mt-2">
            Cada coach pasa una evaluación práctica y teórica antes de
            publicarse. El coach define sus precios, horarios y política de
            cancelación, visibles antes de reservar.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Reservas y cancelaciones
          </h2>
          <p className="mt-2">
            Al reservar aceptas la política de cancelación del coach mostrada en
            ese momento. Las devoluciones dentro de plazo se gestionan
            automáticamente.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold" style={{ color: 'var(--c-ocean)' }}>
            Contacto
          </h2>
          <p className="mt-2">
            Dudas sobre estos términos:{' '}
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
