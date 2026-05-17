import Image from 'next/image'

const COLUMNS = [
  {
    title: 'Producto',
    links: [
      { label: 'Cómo funciona', href: '#como-funciona' },
      { label: 'Coaches', href: '#coaches' },
      { label: 'Preguntas frecuentes', href: '#faq' },
    ],
  },
  {
    title: 'Coaches',
    links: [
      { label: 'Publicar mi perfil', href: '#para-coaches' },
      { label: 'Por qué nadamas', href: '#para-coaches' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', href: '#' },
      { label: 'Términos', href: '#' },
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer
      className="mt-4"
      style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-surface)' }}
    >
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-[34ch]">
            <Image
              src="/logo-nadamas.png"
              alt="nadamas.app"
              width={170}
              height={114}
              className="h-10 w-auto"
            />
            <p className="mt-5 text-[0.97rem] leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
              El marketplace para encontrar y reservar coaches de natación.
              Aprende, mejora y entrena con quien de verdad sabe.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p
                className="text-sm font-bold uppercase tracking-wide"
                style={{ color: 'var(--c-ocean)' }}
              >
                {col.title}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[0.95rem]"
                      style={{ color: 'var(--c-text-2)' }}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-14 flex flex-col gap-3 pt-8 text-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: '1px solid var(--c-border)', color: 'var(--c-text-2)' }}
        >
          <p>© {new Date().getFullYear()} nadamas.app</p>
          <p className="lowercase">nadar + nada más</p>
        </div>
      </div>
    </footer>
  )
}
