import Image from 'next/image'
import Link from 'next/link'
import { FiArrowRight, FiSearch, FiUser } from 'react-icons/fi'

const TAGS = ['Aguas abiertas', 'Triatlón', 'Técnica de crol', 'Principiantes']

const FACES = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
  'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=3&w=96&h=96&q=70',
]

export default function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      {/* wave-ribbon motif: layered diagonal strokes, decorative backdrop only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -right-[18%] -top-[34%] h-[78vh] w-[78vh] rounded-full blur-[12px] opacity-[0.16]"
          style={{ background: 'var(--grad-brand)' }}
        />
        <svg
          className="ribbon-drift absolute -bottom-24 left-0 w-[140%] opacity-[0.5]"
          viewBox="0 0 1440 320"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 196 C 240 96 480 296 720 196 C 960 96 1200 256 1440 156 L 1440 320 L 0 320 Z"
            fill="var(--c-surface)"
          />
          <path
            d="M0 244 C 260 168 520 320 760 232 C 1000 152 1220 292 1440 220 L 1440 320 L 0 320 Z"
            fill="var(--c-aqua-light)"
            opacity="0.35"
          />
        </svg>
      </div>

      <div className="mx-auto grid max-w-[1180px] items-center gap-14 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10 lg:pb-32 lg:pt-24">
        <div className="max-w-[36ch]">
          <h1 className="text-[2.7rem] font-extrabold sm:text-[3.6rem] lg:text-[4.05rem]">
            Tu próximo coach de natación, a un toque.
          </h1>

          <p
            className="mt-6 max-w-[46ch] text-lg leading-relaxed sm:text-xl"
            style={{ color: 'var(--c-text-2)' }}
          >
            Explora coaches por estilo y ubicación, compara su carta de habilidades y agenda tu
            clase en minutos. Sin llamadas, sin esperas.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-sm font-medium"
                style={{ background: 'var(--c-surface)', color: 'var(--c-ocean-mid)' }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#coaches"
              className="group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
              style={{
                background: 'var(--grad-brand)',
                boxShadow: 'var(--shadow-aqua)',
              }}
            >
              <FiSearch aria-hidden="true" className="text-lg" />
              Encontrar coach
              <FiArrowRight
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </a>
            <a
              href="/login?intent=coach"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
              style={{
                color: 'var(--c-ocean)',
                border: '1px solid var(--c-border)',
              }}
            >
              <FiUser aria-hidden="true" className="text-lg" />
              Soy coach
            </a>
          </div>

          <p className="mt-4 text-sm" style={{ color: 'var(--c-text-2)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold" style={{ color: 'var(--c-ocean-mid)' }}>
              Inicia sesión
            </Link>
          </p>

          <div className="mt-9 flex items-center gap-4">
            <div className="flex -space-x-3">
              {FACES.map((src) => (
                <span
                  key={src}
                  className="relative inline-block h-9 w-9 overflow-hidden rounded-full"
                  style={{ border: '2px solid var(--c-bg)' }}
                >
                  <Image src={src} alt="" fill sizes="36px" className="object-cover" />
                </span>
              ))}
            </div>
            <p className="text-sm" style={{ color: 'var(--c-text-2)' }}>
              Nadadores y coaches construyendo la comunidad desde el día uno.
            </p>
          </div>
        </div>

        {/* app mockup framed by the brand gradient (gradient as frame, not text) */}
        <div aria-hidden className="relative mx-auto w-full max-w-[420px]">
          <div
            className="absolute -inset-6 -z-10 rounded-[60px] blur-[36px]"
            style={{ background: 'var(--grad-brand)', opacity: 0.28 }}
          />
          <div
            className="rounded-[44px] p-[3px]"
            style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="overflow-hidden rounded-[41px]" style={{ background: 'var(--c-bg)' }}>
              <div
                className="flex items-center justify-between px-6 pb-3 pt-6"
                style={{ color: 'var(--c-ocean)' }}
              >
                <span className="text-sm font-bold lowercase">nadamas</span>
                <span
                  className="rounded-full px-3 py-1 text-[0.7rem] font-semibold"
                  style={{ background: 'var(--c-surface)', color: 'var(--c-ocean-mid)' }}
                >
                  Coaches cerca
                </span>
              </div>

              <div className="space-y-3 px-5 pb-6">
                {[
                  {
                    name: 'Lucía M.',
                    tag: 'Aguas abiertas',
                    price: '$24',
                    img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=160&h=160&q=70',
                  },
                  {
                    name: 'Diego R.',
                    tag: 'Técnica de crol',
                    price: '$19',
                    img: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=160&h=160&q=70',
                  },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-3 rounded-3xl p-3"
                    style={{ background: 'var(--c-surface)' }}
                  >
                    <span className="relative h-14 w-14 overflow-hidden rounded-2xl">
                      <Image src={c.img} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--c-ocean)' }}>
                        {c.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--c-text-2)' }}>
                        {c.tag}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'var(--c-ocean)' }}>
                        {c.price}
                      </p>
                      <p className="text-[0.68rem]" style={{ color: 'var(--c-text-2)' }}>
                        por clase
                      </p>
                    </div>
                  </div>
                ))}
                <div
                  className="rounded-3xl px-4 py-4 text-center text-sm font-semibold text-white"
                  style={{ background: 'var(--c-ocean)' }}
                >
                  Reservar clase
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
