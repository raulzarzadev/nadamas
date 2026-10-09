'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { tenantSlugFromHost } from '@/lib/tenant-host'

const COLUMNS = [
  {
    title: 'Cómo funciona',
    links: [
      { label: 'Para atletas', href: '/#atletas' },
      { label: 'Para entrenadores', href: '/#entrenadores' },
      { label: 'Para coordinadores', href: '/#directores' },
    ],
  },
  {
    title: 'Explorar',
    links: [
      { label: 'Entrenadores', href: '/coaches' },
      { label: 'Preguntas frecuentes', href: '/#faq' },
      { label: 'Ingresar', href: '/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', href: '/privacidad' },
      { label: 'Términos', href: '/terminos' },
      { label: 'Contacto', href: '/contacto' },
    ],
  },
]

export default function SiteFooter() {
  const [tenantHost, setTenantHost] = useState(false)

  useEffect(() => {
    setTenantHost(Boolean(tenantSlugFromHost(window.location.host)))
  }, [])

  if (tenantHost) {
    return (
      <footer className="mx-auto max-w-5xl px-5 pb-8 pt-2 text-center text-xs text-(--c-text-2) sm:px-8">
        Esta es una escuela en{' '}
        <a href="https://nadamas.app" className="font-bold text-(--c-aqua-strong) hover:underline">
          nadamas.app
        </a>
      </footer>
    )
  }

  return (
    <footer
      className="mt-4"
      style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-surface)' }}
    >
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-[34ch]">
            <Image
              src="/logo-nadamas.webp"
              alt="nadamas.app"
              width={293}
              height={100}
              className="h-10 w-auto"
            />
            <p className="mt-5 text-[0.97rem] leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
              Clases, agendas y progreso de natación para atletas, entrenadores y escuelas.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-bold uppercase" style={{ color: 'var(--c-ocean)' }}>
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
          {/* update year on deploy */}
          <p>© 2026 nadamas.app</p>
          <p className="lowercase">nadar + nada más</p>
        </div>
      </div>
    </footer>
  )
}
