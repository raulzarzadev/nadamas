'use client'

import NotificationsBell from '@comps/app-chrome/NotificationsBell'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { FiArrowRight, FiMenu, FiX } from 'react-icons/fi'
import { useTenantSchool } from '@/context/TenantSchoolContext'

const ROLE_LINKS = [
  { href: '/#atletas', label: 'Atletas', detail: 'Clases y progreso' },
  { href: '/#entrenadores', label: 'Entrenadores', detail: 'Agenda y alumnos' },
  { href: '/#directores', label: 'Coordinadores de escuelas', detail: 'Equipo y horarios' },
] as const

export default function SiteNav() {
  const tenant = useTenantSchool()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 bg-(--c-bg)"
      style={{
        borderBottom: '1px solid var(--c-border)',
        boxShadow: scrolled || open ? 'var(--shadow-sm)' : 'none',
      }}
    >
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-8"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--c-aqua-strong)"
          aria-label={tenant ? `${tenant.name} inicio` : 'nadamas.app inicio'}
          onClick={() => setOpen(false)}
        >
          {tenant ? (
            <>
              {tenant.logoUrl ? (
                <Image
                  src={tenant.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  priority
                  className="size-10 rounded-lg object-contain"
                />
              ) : (
                <span className="grid size-10 place-items-center rounded-lg bg-(--c-surface) font-bold text-(--c-ocean)">
                  {tenant.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-48 truncate font-bold text-(--c-ocean)">{tenant.name}</span>
            </>
          ) : (
            <Image
              src="/logo-nadamas.webp"
              alt=""
              width={293}
              height={100}
              priority
              className="h-9 w-auto"
            />
          )}
        </Link>

        {tenant ? (
          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell />
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-full bg-(--c-aqua-strong) px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean)"
            >
              Ingresar
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden items-center gap-5 lg:flex">
              <span className="text-sm font-semibold text-(--c-text-2)">Cómo funciona:</span>
              {ROLE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap text-sm font-semibold text-(--c-ocean) transition-colors hover:text-(--c-aqua-strong) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--c-aqua-strong)"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="ml-2 inline-flex min-h-11 items-center rounded-full bg-(--c-ocean) px-5 text-sm font-bold text-white transition-colors hover:bg-[#164263] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
              >
                Ingresar
              </Link>
            </div>
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              title={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen((current) => !current)}
              className="grid size-11 place-items-center rounded-full text-(--c-ocean) transition-colors hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) lg:hidden"
            >
              {open ? (
                <FiX aria-hidden="true" className="size-6" />
              ) : (
                <FiMenu aria-hidden="true" className="size-6" />
              )}
            </button>
          </>
        )}
      </nav>

      {!tenant && (
        <div
          id="mobile-menu"
          hidden={!open}
          inert={!open || undefined}
          aria-hidden={!open}
          className="absolute left-4 right-4 top-[calc(100%-0.25rem)] z-50 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-[var(--r-sm)] border border-(--c-border) bg-white p-3 shadow-[var(--shadow-md)] sm:left-auto sm:right-8 sm:w-96 lg:hidden"
        >
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase text-(--c-text-2)">
            Cómo funciona
          </p>
          <ul>
            {ROLE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center justify-between gap-4 rounded-[var(--r-sm)] px-3 py-2 text-(--c-ocean) transition-colors hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--c-aqua-strong)"
                >
                  <span>
                    <span className="block text-sm font-bold">{link.label}</span>
                    <span className="block text-xs text-(--c-text-2)">{link.detail}</span>
                  </span>
                  <FiArrowRight aria-hidden="true" className="shrink-0 text-(--c-aqua-strong)" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-(--c-border) pt-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center justify-center rounded-[var(--r-sm)] bg-(--c-ocean) px-4 font-bold text-white transition-colors hover:bg-[#164263] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
            >
              Ingresar
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
