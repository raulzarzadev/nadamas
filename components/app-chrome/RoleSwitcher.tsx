'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FaPersonSwimming } from 'react-icons/fa6'
import { FiShare2, FiShield } from 'react-icons/fi'
import { GiWhistle } from 'react-icons/gi'
import ProfileShareDialog from '@/components/profile/ProfileShareDialog'
import { useRole } from '@/context/RoleContext'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import { getPublicSchoolUrl } from '@/lib/client/school-public-url'
import type { RoleName } from '@/lib/roles'
import { capitalizeSchoolTerm, type School } from '@/lib/school'
import { ROLE_LABEL, SECONDARY_NAV_BY_ROLE } from './nav-config'

const ROLE_PILL_LABEL: Record<RoleName, string> = {
  athlete: 'atleta',
  coach: 'coach',
  school: 'coordinador',
  admin: 'admin',
}

function initialsFrom(
  user: {
    firstName?: string
    lastName?: string
    displayName?: string
    name?: string
    nickname?: string
    email?: string
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
  school,
  canAccessDirectorMode = false,
}: {
  currentRole?: RoleName
  school?: Pick<School, 'name' | 'slug'> | null
  canAccessDirectorMode?: boolean
}) {
  const tenant = useTenantSchool()
  const terminology = useSchoolTerminology()
  const { roles, activeRole, setActiveRole } = useRole()
  const { user, logout } = useUser() as {
    user: Parameters<typeof initialsFrom>[0]
    logout: () => void
  }
  const router = useRouter()
  const pathname = usePathname()
  const displayedRole = currentRole ?? activeRole
  const RoleIcon =
    displayedRole === 'coach'
      ? GiWhistle
      : displayedRole === 'athlete'
        ? FaPersonSwimming
        : FiShield
  const coachRoleLabel = terminology.schoolId
    ? capitalizeSchoolTerm(terminology.coachSingular)
    : ROLE_LABEL.coach
  const athleteRoleLabel = terminology.schoolId
    ? capitalizeSchoolTerm(terminology.participantSingular)
    : ROLE_LABEL.athlete
  const shareSchool = tenant || school
  const modeItemClassName = (role: RoleName) =>
    `min-w-0 flex-1 rounded-[var(--r-sm)] px-3 py-2 text-left text-sm hover:bg-[var(--c-surface)] cursor-pointer transition-colors ${
      displayedRole === role ? 'bg-[var(--c-surface)] font-semibold text-[var(--c-ocean-mid)]' : ''
    }`
  const secondaryLinks = SECONDARY_NAV_BY_ROLE[displayedRole]
  const avatarText = displayedRole === 'athlete' ? 'TÚ' : initialsFrom(user)
  const userEmail = user?.email
  const [open, setOpen] = useState(false)
  const [athleteSlug, setAthleteSlug] = useState<string | null>()
  const [coachSlug, setCoachSlug] = useState<string | null>()
  const [shareTarget, setShareTarget] = useState<{ title: string; publicUrl: string } | null>(null)
  const switcherRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const focusTrigger = useCallback(() => triggerRef.current?.focus(), [])

  const getItems = () =>
    menuRef.current
      ? Array.from(
          menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
        )
      : []

  const closeAndFocusTrigger = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeAndFocusTrigger()
      return
    }
    const items = getItems()
    if (items.length === 0) return
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)
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
          menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
        )
      : []
    items[0]?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
  }, [open])

  useEffect(() => {
    if (
      !open ||
      (displayedRole !== 'athlete' && displayedRole !== 'coach') ||
      (displayedRole === 'coach' && !roles.coach)
    ) {
      return
    }

    let active = true
    getAuthed('/api/slug?self=1')
      .then((response) => response.json())
      .then((data: { slugs?: { athlete?: string; coach?: string } }) => {
        if (active) setAthleteSlug(data.slugs?.athlete || null)
        if (active) setCoachSlug(data.slugs?.coach || null)
      })
      .catch(() => {
        if (active) setAthleteSlug(null)
        if (active) setCoachSlug(null)
      })

    return () => {
      active = false
    }
  }, [displayedRole, open, roles.coach])

  return (
    <>
      <div ref={switcherRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex cursor-pointer items-center gap-2 rounded-full border bg-white py-1 pl-3.5 pr-1 transition-shadow hover:shadow-[var(--shadow-sm)] ${
            displayedRole === 'coach' || displayedRole === 'school'
              ? 'border-[#cf9b3f] ring-1 ring-[#cf9b3f]'
              : 'border-[var(--c-border)]'
          }`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Rol actual: ${displayedRole === 'coach' ? coachRoleLabel : displayedRole === 'athlete' ? athleteRoleLabel : ROLE_LABEL[displayedRole]}. Cambiar rol o ir a otra sección`}
        >
          <RoleIcon aria-hidden="true" className="size-4 shrink-0 text-(--c-ocean)" />
          <span className="text-sm font-semibold uppercase text-[var(--c-ocean)]">
            {displayedRole === 'coach'
              ? coachRoleLabel.toLowerCase()
              : displayedRole === 'athlete'
                ? athleteRoleLabel.toLowerCase()
                : ROLE_PILL_LABEL[displayedRole]}
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--c-aqua)] to-[var(--c-ocean)] text-[11px] font-bold leading-none text-white">
            {avatarText}
          </span>
        </button>
        {open && (
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className="absolute right-0 z-20 mt-2 w-60 rounded-[var(--r-md)] bg-white shadow-[var(--shadow-md)] border border-[var(--c-border)] p-2"
          >
            {userEmail && (
              <div role="none" className="px-3 py-2">
                <p className="truncate text-xs font-semibold text-[var(--c-text-2)]">{userEmail}</p>
              </div>
            )}

            {secondaryLinks.map((link) => {
              const active = pathname.startsWith(link.href)
              return (
                <div role="none" key={link.href}>
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
                </div>
              )
            })}

            <div role="none" className="flex items-center">
              <button
                type="button"
                role="menuitem"
                aria-current={displayedRole === 'athlete' ? 'true' : undefined}
                onClick={() => {
                  setActiveRole('athlete')
                  setOpen(false)
                }}
                className={modeItemClassName('athlete')}
              >
                <span className="flex items-center gap-2">
                  <FaPersonSwimming aria-hidden="true" className="size-4 shrink-0" />
                  Modo {athleteRoleLabel}
                </span>
              </button>
              {displayedRole === 'athlete' && (
                <button
                  type="button"
                  role="menuitem"
                  aria-label={
                    athleteSlug
                      ? `Compartir perfil de ${athleteRoleLabel.toLowerCase()}`
                      : `Configurar enlace público para compartir el perfil de ${athleteRoleLabel.toLowerCase()}`
                  }
                  title={
                    athleteSlug === undefined
                      ? 'Cargando enlace público'
                      : athleteSlug
                        ? `Compartir perfil de ${athleteRoleLabel.toLowerCase()}`
                        : 'Configurar enlace público'
                  }
                  disabled={athleteSlug === undefined}
                  onClick={() => {
                    setOpen(false)
                    if (!athleteSlug) {
                      router.push('/profile')
                      return
                    }
                    setShareTarget({
                      title: `Compartir perfil de ${athleteRoleLabel.toLowerCase()}`,
                      publicUrl: `${window.location.origin}/atleta/${athleteSlug}`,
                    })
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--c-text-2)] transition-colors hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                >
                  <FiShare2 aria-hidden="true" />
                </button>
              )}
            </div>
            <div role="none" className="flex items-center">
              <button
                type="button"
                role="menuitem"
                aria-current={displayedRole === 'coach' ? 'true' : undefined}
                onClick={() => {
                  setOpen(false)
                  if (roles.coach) {
                    setActiveRole('coach')
                  } else {
                    router.push('/coach/activate')
                  }
                }}
                className={modeItemClassName('coach')}
              >
                <span className="flex items-center gap-2">
                  <GiWhistle aria-hidden="true" className="size-4 shrink-0" />
                  Modo {coachRoleLabel}
                </span>
              </button>
              {displayedRole === 'coach' && roles.coach && (
                <button
                  type="button"
                  role="menuitem"
                  aria-label={
                    coachSlug
                      ? 'Compartir perfil de entrenador'
                      : 'Configurar enlace público para compartir el perfil'
                  }
                  title={
                    coachSlug === undefined
                      ? 'Cargando enlace público'
                      : coachSlug
                        ? 'Compartir perfil de entrenador'
                        : 'Configurar enlace público'
                  }
                  disabled={coachSlug === undefined}
                  onClick={() => {
                    setOpen(false)
                    if (!coachSlug) {
                      router.push('/coach/coach-profile')
                      return
                    }
                    setShareTarget({
                      title: `Compartir perfil de ${coachRoleLabel.toLowerCase()}`,
                      publicUrl: `${window.location.origin}/${coachSlug}`,
                    })
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--c-text-2)] transition-colors hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                >
                  <FiShare2 aria-hidden="true" />
                </button>
              )}
            </div>
            {(!tenant || canAccessDirectorMode) && (
              <div role="none" className="flex items-center">
                <button
                  type="button"
                  role="menuitem"
                  aria-current={displayedRole === 'school' ? 'true' : undefined}
                  onClick={() => {
                    setActiveRole('school')
                    setOpen(false)
                  }}
                  className={modeItemClassName('school')}
                >
                  <span className="flex items-center gap-2">
                    <FiShield aria-hidden="true" className="size-4 shrink-0" />
                    Modo {ROLE_LABEL.school}
                  </span>
                </button>
                {displayedRole === 'school' && canAccessDirectorMode && shareSchool && (
                  <button
                    type="button"
                    role="menuitem"
                    aria-label="Compartir escuela"
                    title={`Compartir ${shareSchool.name}`}
                    onClick={() => {
                      setOpen(false)
                      setShareTarget({
                        title: `Compartir ${shareSchool.name}`,
                        publicUrl: getPublicSchoolUrl(shareSchool.slug),
                      })
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--c-text-2)] transition-colors hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                  >
                    <FiShare2 aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {roles.admin && !tenant && (
              <div role="none" className="flex items-center">
                <button
                  type="button"
                  role="menuitem"
                  aria-current={displayedRole === 'admin' ? 'true' : undefined}
                  onClick={() => {
                    setActiveRole('admin')
                    setOpen(false)
                  }}
                  className={modeItemClassName('admin')}
                >
                  Modo {ROLE_LABEL.admin}
                </button>
              </div>
            )}

            <div role="none">
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
            </div>
          </div>
        )}
      </div>
      {shareTarget && (
        <ProfileShareDialog
          title={shareTarget.title}
          publicUrl={shareTarget.publicUrl}
          onClose={() => setShareTarget(null)}
          returnFocus={focusTrigger}
        />
      )}
    </>
  )
}
