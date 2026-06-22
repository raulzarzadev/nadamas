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

        <nav aria-label="Navegación principal" className="flex items-center gap-2">
          {primary.map((l) => {
            const active = pathname.startsWith(l.href)
            const Icon = NAV_ICONS[l.icon]
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--c-ocean)] text-white'
                    : 'text-[var(--c-text-2)] hover:text-[var(--c-ocean)]'
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
