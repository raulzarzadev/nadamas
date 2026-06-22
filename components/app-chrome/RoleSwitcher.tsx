'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import type { RoleName } from '@/lib/roles'
import { ROLE_LABEL, SECONDARY_NAV_BY_ROLE } from './nav-config'

const ROLE_PILL_LABEL: Record<RoleName, string> = {
  athlete: 'atleta',
  coach: 'coach',
  admin: 'admin',
}

function initialsFrom(
  user: {
    firstName?: string
    lastName?: string
    displayName?: string
    name?: string
    nickname?: string
  } | null
): string {
  const full =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.displayName ||
    user?.name ||
    user?.nickname ||
    ''
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function RoleSwitcher({
  currentRole,
}: {
  currentRole?: 'athlete' | 'coach' | 'admin'
}) {
  const { roles, activeRole, setActiveRole, enableCoach } = useRole()
  const { user, logout } = useUser() as {
    user: Parameters<typeof initialsFrom>[0]
    logout: () => void
  }
  const pathname = usePathname()
  const displayedRole = currentRole ?? activeRole
  const secondaryLinks = SECONDARY_NAV_BY_ROLE[displayedRole]
  const avatarText = displayedRole === 'athlete' ? 'TÚ' : initialsFrom(user)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  const handleEnableCoach = async () => {
    setBusy(true)
    try {
      await enableCoach()
      setActiveRole('coach')
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  const getItems = () =>
    menuRef.current
      ? Array.from(
          menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
        )
      : []

  const closeAndFocusTrigger = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeAndFocusTrigger()
      return
    }
    const items = getItems()
    if (items.length === 0) return
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex: number | null = null
    if (e.key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length
    } else if (e.key === 'ArrowUp') {
      nextIndex =
        currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = items.length - 1
    }
    if (nextIndex !== null) {
      e.preventDefault()
      items[nextIndex]?.focus()
    }
  }

  useEffect(() => {
    if (!open) return
    const items = menuRef.current
      ? Array.from(
          menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
        )
      : []
    items[0]?.focus()
  }, [open])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex cursor-pointer items-center gap-2 rounded-full border bg-white py-1 pl-3.5 pr-1 transition-shadow hover:shadow-[var(--shadow-sm)] ${
          displayedRole === 'coach'
            ? 'border-[#cf9b3f] ring-1 ring-[#cf9b3f]'
            : 'border-[var(--c-border)]'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Rol actual: ${ROLE_LABEL[displayedRole]}. Cambiar rol o ir a otra sección`}
      >
        <span className="text-sm font-semibold text-[var(--c-ocean)]">
          {ROLE_PILL_LABEL[displayedRole]}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--c-aqua)] to-[var(--c-ocean)] text-[11px] font-bold leading-none text-white">
          {avatarText}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <ul
            ref={menuRef}
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className="absolute right-0 z-20 mt-2 w-60 rounded-[var(--r-md)] bg-white shadow-[var(--shadow-md)] border border-[var(--c-border)] p-2"
          >
            {secondaryLinks.map((link) => {
              const active = pathname.startsWith(link.href)
              return (
                <li role="none" key={link.href}>
                  <Link
                    role="menuitem"
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={`block w-full rounded-[var(--r-sm)] px-3 py-2 text-left text-sm hover:bg-[var(--c-surface)] cursor-pointer ${
                      active ? 'font-semibold text-[var(--c-ocean-mid)]' : ''
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}

            <li role="none" aria-hidden="true">
              <div className="my-1 border-t border-[var(--c-border)]" />
            </li>

            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setActiveRole('athlete')
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm hover:bg-[var(--c-surface)] cursor-pointer"
              >
                Modo {ROLE_LABEL.athlete}
              </button>
            </li>
            <li role="none">
              {roles.coach ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveRole('coach')
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm hover:bg-[var(--c-surface)] cursor-pointer"
                >
                  Modo {ROLE_LABEL.coach}
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={handleEnableCoach}
                  className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm text-[var(--c-aqua-strong)] font-semibold hover:bg-[var(--c-surface)] disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Activando…' : 'Activar modo entrenador'}
                </button>
              )}
            </li>
            {roles.admin && (
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveRole('admin')
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm hover:bg-[var(--c-surface)] cursor-pointer"
                >
                  Modo {ROLE_LABEL.admin}
                </button>
              </li>
            )}

            <li role="none" aria-hidden="true">
              <div className="my-1 border-t border-[var(--c-border)]" />
            </li>

            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  logout()
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm text-red-600 hover:bg-[var(--c-surface)] cursor-pointer"
              >
                Cerrar sesión
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  )
}
