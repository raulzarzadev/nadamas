import Image from 'next/image'

const FACES = [
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
]

const METRICS = [
  { value: 'Verificados', label: 'cada coach revisado a mano antes de publicar' },
  { value: 'Minutos', label: 'de buscar a clase reservada, no días de mensajes' },
  { value: 'En tu ciudad', label: 'piscina, mar abierto o donde entrenes' },
]

export default function SocialProof() {
  return (
    <section className="reveal mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <p
          className="max-w-[34ch] text-pretty text-2xl font-medium leading-snug sm:text-[1.7rem]"
          style={{ color: 'var(--c-ocean)' }}
        >
          Construido con coaches y nadadores reales, para que reservar tu próxima
          clase sea lo más simple del día.
        </p>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-3.5">
            {FACES.map((src) => (
              <span
                key={src}
                className="relative inline-block h-12 w-12 overflow-hidden rounded-full"
                style={{ border: '2.5px solid var(--c-bg)', boxShadow: 'var(--shadow-sm)' }}
              >
                <Image src={src} alt="" fill sizes="48px" className="object-cover" />
              </span>
            ))}
          </div>
          <p className="text-sm leading-snug" style={{ color: 'var(--c-text-2)' }}>
            La comunidad
            <br />
            crece cada semana
          </p>
        </div>
      </div>

      <div
        className="mt-12 grid gap-px overflow-hidden rounded-[28px] sm:grid-cols-3"
        style={{ background: 'var(--c-border)' }}
      >
        {METRICS.map((m) => (
          <div
            key={m.value}
            className="px-7 py-7"
            style={{ background: 'var(--c-surface)' }}
          >
            <p
              className="text-lg font-bold tracking-tight"
              style={{ color: 'var(--c-ocean)' }}
            >
              {m.value}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
