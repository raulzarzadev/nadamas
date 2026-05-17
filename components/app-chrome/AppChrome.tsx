'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/context/RoleContext'
import RoleSwitcher from './RoleSwitcher'
import { NAV_BY_ROLE } from './nav-config'
import type { RoleName } from '@/lib/roles'

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

  return (
    <div
      data-theme="nadamas"
      className="min-h-screen bg-[var(--c-bg)] text-[var(--c-ocean)]"
    >
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <Link href={`/${role}/home`} className="relative w-32 h-7 block">
            <Image
              src="/nadamas/logo-3.png"
              fill
              priority
              style={{ objectFit: 'contain', objectPosition: 'left' }}
              alt="nadamas"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin/home"
                className="rounded-full px-3 py-2 text-sm font-semibold bg-[var(--c-ocean)] text-white hover:opacity-90 transition-opacity"
              >
                Admin
              </Link>
            )}
            <RoleSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-24 pt-6">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[var(--c-border)]">
        <ul className="flex justify-around">
          {links.slice(0, 5).map((l) => {
            const active = pathname === l.href
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`block px-3 py-3 text-xs font-semibold ${
                    active
                      ? 'text-[var(--c-ocean-mid)]'
                      : 'text-[var(--c-text-2)]'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
