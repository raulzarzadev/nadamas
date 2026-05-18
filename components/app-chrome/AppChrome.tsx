'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/context/RoleContext'
import RoleSwitcher from './RoleSwitcher'
import { NAV_BY_ROLE, ROLE_LABEL } from './nav-config'
import type { RoleName } from '@/lib/roles'
import {
  FiBarChart2,
  FiCalendar,
  FiHome,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
} from 'react-icons/fi'

export default function AppChrome({
  role,
  children,
}: {
  role: RoleName
  children: React.ReactNode
}) {
  const { isAdmin } = useRole()
  const pathname = usePathname()
  const links = NAV_BY_ROLE[role]
  const navIcons = {
    home: FiHome,
    search: FiSearch,
    chart: FiBarChart2,
    calendar: FiCalendar,
    users: FiUsers,
    badge: FiShield,
    user: FiUser,
  }

  return (
    <div
      data-theme="nadamas"
      className="min-h-screen bg-[var(--c-bg)] text-[var(--c-ocean)]"
    >
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[var(--c-border)]">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-3 py-2.5 sm:px-4 sm:py-3">
          <Link href="/" className="relative block h-7 w-24 shrink-0 sm:w-28">
            <Image
              src="/logo-nadamas.webp"
              fill
              sizes="112px"
              priority
              style={{ objectFit: 'contain', objectPosition: 'left' }}
              alt="Nadamas logo"
            />
          </Link>
          <nav
            aria-label="Navegación principal"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
          >
            {links.map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--c-surface)] text-[var(--c-ocean-mid)]'
                      : 'text-[var(--c-text-2)] hover:text-[var(--c-ocean)]'
                  }`}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-[var(--c-border)] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--c-text-2)] xl:inline-flex">
              {ROLE_LABEL[role]}
            </span>
            {isAdmin && (
              <Link
                href="/admin/home"
                aria-label="Panel de administración"
                className="rounded-full px-3 py-2 text-sm font-semibold bg-[var(--c-ocean)] text-white hover:opacity-90 transition-opacity"
              >
                Admin
              </Link>
            )}
            <RoleSwitcher currentRole={role} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2.5 pb-20 pt-4 sm:px-4 sm:pb-24 sm:pt-6">{children}</main>

      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--c-border)] bg-white/95 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-2 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
          {links.slice(0, 5).map((l) => {
            const active = pathname === l.href
            const Icon = navIcons[l.icon]
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 text-[11px] font-semibold leading-none transition-colors ${
                    active
                      ? 'bg-[var(--c-surface)] text-[var(--c-ocean-mid)]'
                      : 'text-[var(--c-text-2)]'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  <span className="whitespace-nowrap">{l.mobileLabel}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
