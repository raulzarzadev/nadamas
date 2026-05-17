import Image from 'next/image'

type Coach = {
  name: string
  specialty: string
  location: string
  rating: string
  reviews: number
  price: string
  availability: string
  img: string
}

const COACHES: Coach[] = [
  {
    name: 'Lucía Marín',
    specialty: 'Aguas abiertas',
    location: 'Valencia · mar',
    rating: '4.9',
    reviews: 38,
    price: '$26',
    availability: 'Libre mañanas',
    img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=900&q=72',
  },
  {
    name: 'Diego Reyes',
    specialty: 'Triatlón',
    location: 'Ciudad de México',
    rating: '5.0',
    reviews: 21,
    price: '$32',
    availability: 'Quedan 3 huecos',
    img: 'https://images.unsplash.com/photo-1622599511051-16f55a1234d0?auto=format&fit=crop&w=900&q=72',
  },
  {
    name: 'Ana Solís',
    specialty: 'Principiantes',
    location: 'Bogotá · piscina',
    rating: '4.8',
    reviews: 52,
    price: '$18',
    availability: 'Libre tardes',
    img: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=900&q=72',
  },
  {
    name: 'Marco Vidal',
    specialty: 'Técnica de crol',
    location: 'Madrid',
    rating: '4.9',
    reviews: 44,
    price: '$24',
    availability: 'Fines de semana',
    img: 'https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?auto=format&fit=crop&w=900&q=72',
  },
  {
    name: 'Sofía Cano',
    specialty: 'Niños',
    location: 'Guadalajara',
    rating: '5.0',
    reviews: 67,
    price: '$20',
    availability: 'Libre entre semana',
    img: 'https://images.unsplash.com/photo-1560089000-7433a4ebbd64?auto=format&fit=crop&w=900&q=72',
  },
]

function Meta({ c, light }: { c: Coach; light?: boolean }) {
  const sub = light ? 'color-mix(in oklch, #f8fafc 76%, transparent)' : 'var(--c-text-2)'
  const main = light ? '#f8fafc' : 'var(--c-ocean)'
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-[0.72rem] font-semibold"
          style={{
            background: light
              ? 'color-mix(in oklch, var(--c-aqua) 26%, transparent)'
              : 'var(--c-surface)',
            color: light ? 'var(--c-aqua-light)' : 'var(--c-ocean-mid)',
          }}
        >
          {c.specialty}
        </span>
        <span className="text-[0.78rem] font-medium" style={{ color: sub }}>
          Evaluado · {c.rating} ({c.reviews})
        </span>
      </div>
      <p className="mt-3 text-lg font-bold" style={{ color: main }}>
        {c.name}
      </p>
      <p className="text-sm" style={{ color: sub }}>
        {c.location}
      </p>
      <div className="mt-4 flex items-end justify-between">
        <p className="text-sm font-medium" style={{ color: sub }}>
          {c.availability}
        </p>
        <p className="text-base font-bold" style={{ color: main }}>
          {c.price}
          <span className="text-xs font-medium" style={{ color: sub }}>
            {' '}
            / clase
          </span>
        </p>
      </div>
    </>
  )
}

export default function MarketplacePreview() {
  const [feature, tall, wideDark, small1, small2] = COACHES
  return (
    <section id="coaches" className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 lg:py-28">
      <div className="reveal flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[28ch]">
          <h2 className="text-[2.1rem] font-extrabold sm:text-[2.9rem]">
            Coaches para tu objetivo
          </h2>
          <p className="mt-4 text-lg" style={{ color: 'var(--c-text-2)' }}>
            Una muestra de los perfiles que verás. Cada coach pasa una
            evaluación práctica y teórica, describe sus habilidades y suma las
            valoraciones de quienes ya entrenaron con él.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
          style={{ border: '1px solid var(--c-border)', color: 'var(--c-ocean)' }}
        >
          Ver todos los coaches
        </a>
      </div>

      {/* deliberately varied sizes: hero card + tall column + wide dark + two compact */}
      <div className="reveal mt-12 grid grid-cols-1 gap-5 sm:grid-cols-6">
        <article
          className="group relative overflow-hidden rounded-[32px] sm:col-span-4"
          style={{ boxShadow: 'var(--shadow-md)', background: 'var(--c-bg)' }}
        >
          <div className="relative h-64 w-full sm:h-80">
            <Image
              src={feature.img}
              alt={`${feature.name}, ${feature.specialty}`}
              fill
              sizes="(max-width:640px) 100vw, 60vw"
              className="object-cover"
              style={{ transition: 'transform 700ms var(--ease-expo)' }}
            />
          </div>
          <div className="p-7">
            <Meta c={feature} />
          </div>
        </article>

        <article
          className="overflow-hidden rounded-[32px] sm:col-span-2 sm:row-span-2"
          style={{ boxShadow: 'var(--shadow-md)', background: 'var(--c-bg)' }}
        >
          <div className="relative h-56 w-full sm:h-[19rem]">
            <Image
              src={tall.img}
              alt={`${tall.name}, ${tall.specialty}`}
              fill
              sizes="(max-width:640px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <Meta c={tall} />
          </div>
        </article>

        <article
          className="relative flex min-h-[15rem] flex-col justify-end overflow-hidden rounded-[32px] p-7 sm:col-span-4"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <Image
            src={wideDark.img}
            alt={`${wideDark.name}, ${wideDark.specialty}`}
            fill
            sizes="(max-width:640px) 100vw, 60vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 28%, oklch(0.23 0.05 250 / 0.82) 100%)',
            }}
          />
          <div className="relative">
            <Meta c={wideDark} light />
          </div>
        </article>

        <article
          className="overflow-hidden rounded-[28px] sm:col-span-3"
          style={{ boxShadow: 'var(--shadow-sm)', background: 'var(--c-surface)' }}
        >
          <div className="relative h-44 w-full">
            <Image
              src={small1.img}
              alt={`${small1.name}, ${small1.specialty}`}
              fill
              sizes="(max-width:640px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <Meta c={small1} />
          </div>
        </article>

        <article
          className="overflow-hidden rounded-[28px] sm:col-span-3"
          style={{ boxShadow: 'var(--shadow-sm)', background: 'var(--c-surface)' }}
        >
          <div className="relative h-44 w-full">
            <Image
              src={small2.img}
              alt={`${small2.name}, ${small2.specialty}`}
              fill
              sizes="(max-width:640px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <Meta c={small2} />
          </div>
        </article>
      </div>
    </section>
  )
}
