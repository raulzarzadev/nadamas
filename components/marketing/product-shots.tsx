import Image from 'next/image'

type Shot = {
  title: string
  caption: string
  img: string
}

const SHOTS: Shot[] = [
  {
    title: 'Explora el marketplace',
    caption: 'Coaches cerca de ti, filtrados por lo que quieres mejorar.',
    img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=640&q=72',
  },
  {
    title: 'Perfil del coach',
    caption: 'Experiencia, especialidades, reseñas y precios claros.',
    img: 'https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?auto=format&fit=crop&w=640&q=72',
  },
  {
    title: 'Tus reservas',
    caption: 'Lo que viene y lo que pasó, siempre a mano.',
    img: 'https://images.unsplash.com/photo-1565992441121-4367c2967103?auto=format&fit=crop&w=640&q=72',
  },
  {
    title: 'Calendario en vivo',
    caption: 'Disponibilidad real, sin dobles reservas.',
    img: 'https://images.unsplash.com/photo-1622599511051-16f55a1234d0?auto=format&fit=crop&w=640&q=72',
  },
  {
    title: 'Historial de progreso',
    caption: 'Cada sesión suma a tu evolución como nadador.',
    img: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=640&q=72',
  },
]

function Phone({ shot, offset }: { shot: Shot; offset: number }) {
  return (
    <figure
      className="reveal shrink-0"
      style={{ width: 'min(248px, 70vw)', marginTop: offset }}
    >
      <div
        className="rounded-[40px] p-2.5"
        style={{
          background: 'var(--c-ocean)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          className="relative overflow-hidden rounded-[32px]"
          style={{ aspectRatio: '9 / 19', background: 'var(--c-surface)' }}
        >
          <div
            aria-hidden
            className="absolute left-1/2 top-2.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full"
            style={{ background: 'var(--c-ocean)' }}
          />
          <Image
            src={shot.img}
            alt={shot.title}
            fill
            sizes="248px"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, oklch(0.23 0.05 250 / 0.12) 0%, transparent 30%, oklch(0.23 0.05 250 / 0.72) 100%)',
            }}
          />
          <figcaption className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-base font-bold" style={{ color: '#f8fafc' }}>
              {shot.title}
            </p>
            <p
              className="mt-1 text-[0.82rem] leading-snug"
              style={{ color: 'color-mix(in oklch, #f8fafc 78%, transparent)' }}
            >
              {shot.caption}
            </p>
          </figcaption>
        </div>
      </div>
    </figure>
  )
}

export default function ProductShots() {
  // staggered vertical offsets create an editorial, non-grid rhythm
  const offsets = [0, 56, 20, 72, 30]
  return (
    <section className="overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="reveal max-w-[34ch]">
          <h2 className="text-[2.1rem] font-extrabold sm:text-[2.9rem]">
            Así se siente por dentro
          </h2>
          <p className="mt-4 text-lg" style={{ color: 'var(--c-text-2)' }}>
            Una app diseñada para que reservar y entrenar fluya como el agua.
          </p>
        </div>
      </div>

      <div className="mt-14 overflow-x-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max items-start gap-6 px-5 sm:px-8 lg:px-[max(2rem,calc((100vw-1180px)/2))]">
          {SHOTS.map((s, i) => (
            <Phone key={s.title} shot={s} offset={offsets[i] ?? 0} />
          ))}
        </div>
      </div>
    </section>
  )
}
