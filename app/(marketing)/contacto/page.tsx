import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contacto · nadamas.app',
  description: 'Habla con el equipo de nadamas.app.',
  alternates: { canonical: 'https://nadamas.app/contacto' },
}

export default function ContactoPage() {
  return (
    <main className="mx-auto max-w-[60ch] px-5 py-20 sm:px-8">
      <h1 className="text-3xl font-extrabold" style={{ color: 'var(--c-ocean)' }}>
        Contacto
      </h1>
      <p
        className="mt-4 text-[1.05rem] leading-relaxed"
        style={{ color: 'var(--c-text-2)' }}
      >
        ¿Eres nadador o coach y quieres hablar con nosotros? Estamos
        construyendo nadamas.app y nos interesa lo que tengas que decir.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <a
          href="mailto:hola@nadamas.app"
          className="inline-flex w-fit items-center justify-center rounded-full px-7 py-4 text-base font-semibold text-white"
          style={{ background: 'var(--c-aqua-strong)' }}
        >
          hola@nadamas.app
        </a>
        <p className="text-sm" style={{ color: 'var(--c-text-2)' }}>
          Respondemos en horario laboral, normalmente en menos de 48 horas.
        </p>
      </div>
    </main>
  )
}
