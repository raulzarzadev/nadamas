'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FiBarChart2,
  FiCalendar,
  FiHome,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import { useRole } from '@/context/RoleContext'
import type { RoleName } from '@/lib/roles'
import { PRIMARY_NAV_BY_ROLE } from './nav-config'
import RoleSwitcher from './RoleSwitcher'

const NAV_ICONS = {
  home: FiHome,
  search: FiSearch,
  chart: FiBarChart2,
  calendar: FiCalendar,
  users: FiUsers,
  badge: FiShield,
  user: FiUser,
}

// Shared top bar: logo + role pill + the two primary destinations as a
// segmented toggle. Rendered inside the app shell and on marketing pages for
// logged-in users so the chrome is identical everywhere. When no `role` is
// passed it follows the active role from RoleContext.
export default function AppNav({ role: roleProp }: { role?: RoleName }) {
  const { activeRole } = useRole()
  const role = roleProp ?? activeRole
  const pathname = usePathname()
  const primary = PRIMARY_NAV_BY_ROLE[role]

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--c-border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-4">
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
          <div className="ml-auto flex items-center gap-2">
            <RoleSwitcher currentRole={role} />
          </div>
        </div>

        <nav aria-label="Navegación principal" className="grid grid-cols-3 gap-2">
          {primary.map((l) => {
            const active = pathname.startsWith(l.href)
            const Icon = NAV_ICONS[l.icon]
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[var(--r-sm)] border px-2.5 py-3 text-center text-sm font-semibold shadow-[0_1px_0_rgba(13,44,72,0.05)] transition-[background-color,border-color,box-shadow,color,transform] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] active:translate-y-0 sm:px-4 ${
                  active
                    ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                    : 'border-[var(--c-border)] bg-white text-[var(--c-text-2)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)]'
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate sm:hidden">{l.mobileLabel}</span>
                <span className="hidden min-w-0 truncate sm:inline">{l.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
