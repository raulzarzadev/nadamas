import Image from 'next/image'

const MOMENTS = [
  {
    src: '/images/landing/alberca-manana.webp',
    alt: 'Alberca de 50 metros con carriles y palmeras bajo un cielo despejado',
    label: 'Temprano',
    detail: 'Clases antes de la escuela o el trabajo.',
    width: 960,
    height: 1200,
    layout: '',
    sizes: '(min-width: 1180px) 330px, (min-width: 640px) 45vw, 92vw',
    imageClass: 'aspect-[4/3] sm:aspect-[4/5] lg:aspect-auto lg:h-[480px]',
  },
  {
    src: '/images/landing/alberca-grupo.webp',
    alt: 'Grupo de niños de una clase de natación sonriendo desde la orilla de la alberca',
    label: 'En grupo',
    detail: 'Clases grupales con cupos a la vista.',
    width: 1200,
    height: 1114,
    sizes: '(min-width: 1180px) 520px, 92vw',
    layout: 'sm:order-first sm:col-span-2 lg:order-none lg:col-span-1',
    imageClass: 'aspect-[1200/1114] lg:aspect-auto lg:h-[480px] object-bottom',
  },
  {
    src: '/images/landing/alberca-noche.webp',
    alt: 'Nadadores entrenando de noche en una alberca iluminada',
    label: 'De noche',
    detail: 'Entrenos registrados al salir del agua.',
    width: 960,
    height: 1200,
    layout: '',
    sizes: '(min-width: 1180px) 330px, (min-width: 640px) 45vw, 92vw',
    imageClass: 'aspect-[4/3] sm:aspect-[4/5] lg:aspect-auto lg:h-[480px]',
  },
] as const

export default function PoolMoments() {
  return (
    <section
      aria-labelledby="momentos-title"
      className="overflow-hidden bg-(--c-ocean) px-5 py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase text-[#9ceaf0]">En la alberca</p>
            <h2
              id="momentos-title"
              className="mt-3 max-w-[18ch] text-3xl font-extrabold sm:text-4xl"
              style={{ color: '#fff' }}
            >
              Del amanecer a la noche, cada horario cuenta.
            </h2>
          </div>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.6fr_1fr]">
          {MOMENTS.map((moment) => (
            <li key={moment.label} className={`reveal ${moment.layout}`}>
              <figure className="relative overflow-hidden rounded-[var(--r-lg)]">
                <Image
                  src={moment.src}
                  alt={moment.alt}
                  width={moment.width}
                  height={moment.height}
                  sizes={moment.sizes}
                  className={`w-full object-cover ${moment.imageClass}`}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,24,42,0.78),transparent_55%)]"
                />
                <figcaption className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-lg font-bold" style={{ color: '#fff' }}>
                    {moment.label}
                  </p>
                  <p className="mt-1 text-sm text-[#d0e7ef]">{moment.detail}</p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
