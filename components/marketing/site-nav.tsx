'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#coaches', label: 'Coaches' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#para-coaches', label: 'Para coaches' },
  { href: '#faq', label: 'FAQ' },
]

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        transition: 'background 420ms var(--ease-expo), box-shadow 420ms var(--ease-expo), border-color 420ms var(--ease-expo)',
        background: scrolled ? 'color-mix(in oklch, var(--c-bg) 86%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(160%) blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(160%) blur(14px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--c-border)' : 'transparent'}`,
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      }}
    >
      <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="#inicio"
          className="flex items-center gap-2.5"
          aria-label="nadamas.app inicio"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/logo-nadamas.webp"
            alt=""
            width={293}
            height={100}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <ul className="hidden items-center gap-9 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[0.95rem] font-medium"
                style={{ color: 'var(--c-text-2)', transition: 'color 220ms var(--ease-expo)' }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="#para-coaches"
            className="rounded-full px-4 py-2.5 text-[0.92rem] font-semibold"
            style={{ color: 'var(--c-ocean)' }}
          >
            Soy coach
          </a>
          <a
            href="#coaches"
            className="rounded-full px-5 py-2.5 text-[0.92rem] font-semibold text-white"
            style={{
              background: 'var(--c-aqua)',
              boxShadow: 'var(--shadow-aqua)',
              transition: 'transform 280ms var(--ease-expo), filter 280ms var(--ease-expo)',
            }}
          >
            Encontrar coach
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
          style={{ background: 'var(--c-surface)', color: 'var(--c-ocean)' }}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden className="relative block h-3.5 w-5">
            <span
              className="absolute left-0 block h-[2px] w-5 rounded-full"
              style={{
                background: 'currentColor',
                top: open ? '6px' : '0',
                transform: open ? 'rotate(45deg)' : 'none',
                transition: 'top 260ms var(--ease-expo), transform 260ms var(--ease-expo)',
              }}
            />
            <span
              className="absolute left-0 top-[6px] block h-[2px] w-5 rounded-full"
              style={{
                background: 'currentColor',
                opacity: open ? 0 : 1,
                transition: 'opacity 180ms var(--ease-expo)',
              }}
            />
            <span
              className="absolute left-0 block h-[2px] w-5 rounded-full"
              style={{
                background: 'currentColor',
                top: open ? '6px' : '12px',
                transform: open ? 'rotate(-45deg)' : 'none',
                transition: 'top 260ms var(--ease-expo), transform 260ms var(--ease-expo)',
              }}
            />
          </span>
        </button>
      </nav>

      <div
        id="mobile-menu"
        className="overflow-hidden lg:hidden"
        aria-hidden={!open}
        inert={!open || undefined}
        style={{
          maxHeight: open ? '420px' : '0',
          opacity: open ? 1 : 0,
          transition: 'max-height 460ms var(--ease-expo), opacity 320ms var(--ease-expo)',
          background: 'var(--c-bg)',
          borderBottom: open ? '1px solid var(--c-border)' : '1px solid transparent',
        }}
      >
        <ul className="mx-auto flex max-w-[1180px] flex-col gap-1 px-5 py-4 sm:px-8">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-base font-medium"
                style={{ color: 'var(--c-ocean)' }}
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="mt-2">
            <a
              href="#coaches"
              onClick={() => setOpen(false)}
              className="block rounded-full px-5 py-3 text-center text-base font-semibold text-white"
              style={{ background: 'var(--c-aqua)', boxShadow: 'var(--shadow-aqua)' }}
            >
              Encontrar coach
            </a>
          </li>
        </ul>
      </div>
    </header>
  )
}
