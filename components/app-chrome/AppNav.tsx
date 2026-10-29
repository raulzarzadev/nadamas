'use client'
import CoachSchoolSwitcher from '@comps/coach/CoachSchoolSwitcher'
import AthleteSchoolSwitcher from '@comps/school/AthleteSchoolSwitcher'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  FiActivity,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiDollarSign,
  FiHome,
  FiSearch,
  FiSettings,
  FiShield,
  FiUser,
  FiUsers,
} from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useRole } from '@/context/RoleContext'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { hasTenantBrand, useTenantSchool } from '@/context/TenantSchoolContext'
import { useUser } from '@/context/UserContext'
import { isPastAthleteBooking } from '@/lib/athlete-upcoming-count'
import { getAuthed } from '@/lib/client/authed-api'
import type { RoleName } from '@/lib/roles'
import { capitalizeSchoolTerm, type School, type SchoolMembership } from '@/lib/school'
import { schoolsForWorkspace } from '@/lib/school-workspace'
import { ensureAthleteBookings, useAppDispatch, useAppSelector } from '@/lib/store/athlete-bookings'
import NotificationsBell from './NotificationsBell'
import { PRIMARY_NAV_BY_ROLE } from './nav-config'
import RoleSwitcher from './RoleSwitcher'

const NAV_ICONS = {
  training: FiActivity,
  home: FiHome,
  search: FiSearch,
  chart: FiBarChart2,
  calendar: FiCalendar,
  users: FiUsers,
  badge: FiShield,
  user: FiUser,
  bell: FiBell,
  payments: FiDollarSign,
}

// Shared top bar: logo + role pill + the two primary destinations as a
// segmented toggle. Rendered inside the app shell and on marketing pages for
// logged-in users so the chrome is identical everywhere. When no `role` is
// passed it follows the active role from RoleContext.
export default function AppNav({
  mode: modeProp,
  desktopSidebar = false,
}: {
  mode?: RoleName
  desktopSidebar?: boolean
}) {
  const headerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const header = headerRef.current
    const parent = header?.parentElement
    if (!header || !parent) return
    const measure = () =>
      parent.style.setProperty('--app-header-h', `${header.getBoundingClientRect().height}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => {
      observer.disconnect()
      parent.style.removeProperty('--app-header-h')
    }
  }, [])
  const tenant = useTenantSchool()
  const brandTenant = hasTenantBrand(tenant) ? tenant : null
  const { activeRole, roles } = useRole()
  const terminology = useSchoolTerminology()
  const role = modeProp ?? activeRole
  const pathname = usePathname()
  const { selected: selectedSchool, status: schoolSelectionStatus } = useSchoolSelection({
    includePersonal: role === 'coach' || role === 'athlete',
    athleteMode: role === 'athlete',
  })
  const { user } = useUser()
  const uid = user?.uid || user?.id
  const dispatch = useAppDispatch()
  const bookingState = useAppSelector((state) => state.athleteBookings)
  const upcomingCount =
    bookingState.uid === uid && bookingState.loaded
      ? bookingState.bookings.filter(
          (booking) =>
            // Athletes no longer pick a school in the header: count all, or the tenant's.
            (!tenant || booking.schoolId === tenant.id) && !isPastAthleteBooking(booking)
        ).length
      : null
  useEffect(() => {
    if (role === 'athlete' && uid) void dispatch(ensureAthleteBookings(uid)).catch(() => {})
  }, [uid, role, dispatch])
  const publicAthleteSchedule = role === 'athlete' && pathname === '/athlete/schedule'
  const primary = PRIMARY_NAV_BY_ROLE[role]
    .filter(
      (item) =>
        // Coach Planes is personal-only, so it's hidden just inside a school's site.
        item.icon !== 'payments' || role !== 'coach' || !tenant
    )
    .map((item) => {
      if (
        terminology.schoolId &&
        (item.href === '/coach/students' || item.href === '/school/students')
      ) {
        const label = capitalizeSchoolTerm(terminology.participantPlural)
        return { ...item, label, mobileLabel: label }
      }
      if (terminology.schoolId && item.href === '/school/coaches') {
        const label = capitalizeSchoolTerm(terminology.coachPlural)
        return { ...item, label, mobileLabel: label }
      }
      return item
    })
  const [schoolAccess, setSchoolAccess] = useState<{
    school: School
    membership: SchoolMembership
  } | null>(null)
  const workspaceBrand =
    brandTenant || (role === 'school' ? selectedSchool?.school || schoolAccess?.school : null)
  const hasDirectorAccess = Boolean(
    schoolAccess?.membership.status === 'active' &&
      (schoolAccess.membership.roles?.includes('director') ||
        schoolAccess.membership.role === 'director')
  )
  const canShowWorkspaceNavigation =
    pathname !== '/' &&
    (role !== 'coach' || roles.coach) &&
    (role !== 'school' || hasDirectorAccess) &&
    (!tenant ||
      role === 'athlete' ||
      (schoolSelectionStatus === 'ready' && selectedSchool !== null))

  useEffect(() => {
    // Loaded on every page (incl. shared ones like /notifications): Coordinador needs the
    // school's name and director access, and the role menu uses it in every mode.

    let active = true
    const storedSchoolId = window.localStorage.getItem('nadamas.schoolId')
    const refreshSchoolAccess = () => {
      getAuthed('/api/schools')
        .then(
          (response) =>
            response.json() as Promise<{
              schools?: Array<{ school: School; membership: SchoolMembership }>
              ownedSchool?: School | null
            }>
        )
        .then((payload) => {
          if (!active) return
          const schools = schoolsForWorkspace(payload.schools || [], false).filter(
            (item) => !tenant || item.school.id === tenant.id
          )
          const selected =
            schools.find((item) => item.school.id === storedSchoolId) ||
            schools[0] ||
            (payload.ownedSchool
              ? {
                  school: payload.ownedSchool,
                  membership: {
                    id: `${payload.ownedSchool.id}_owner`,
                    schoolId: payload.ownedSchool.id,
                    userId: payload.ownedSchool.directorId,
                    role: 'director' as const,
                    roles: ['director'] as const,
                    status: 'active' as const,
                    createdAt: payload.ownedSchool.createdAt,
                    updatedAt: payload.ownedSchool.updatedAt,
                  },
                }
              : null)
          setSchoolAccess(selected)
        })
        .catch(() => {
          if (active) {
            setSchoolAccess(null)
          }
        })
    }

    refreshSchoolAccess()
    window.addEventListener('nadamas:school-access-updated', refreshSchoolAccess)

    return () => {
      active = false
      window.removeEventListener('nadamas:school-access-updated', refreshSchoolAccess)
    }
  }, [tenant])

  // Athlete search lives inside Horarios, so its pages keep that tab active.
  const isActiveNav = (href: string) =>
    pathname.startsWith(href) ||
    (href === '/athlete/schedule' && pathname.startsWith('/athlete/search'))
  const tabs = [
    ...primary.map((item) => ({
      href: item.href,
      label: item.mobileLabel,
      icon: NAV_ICONS[item.icon],
      count: role === 'athlete' && item.href === '/athlete/schedule' ? upcomingCount : null,
    })),
    ...(role === 'school'
      ? [{ href: '/school/settings', label: 'Configuración', icon: FiSettings, count: null }]
      : []),
  ]

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-[var(--c-border)] bg-white/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="relative flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              aria-label={workspaceBrand ? `${workspaceBrand.name}, inicio` : 'Nadamas, inicio'}
              className={`${workspaceBrand ? 'min-w-0 flex-1' : 'relative block h-7 w-24 shrink-0 sm:w-28'} ${desktopSidebar && canShowWorkspaceNavigation ? 'sm:hidden' : ''}`}
            >
              <WorkspaceBrand school={workspaceBrand} />
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <NotificationsBell />
              <RoleSwitcher
                currentRole={role}
                school={schoolAccess?.school}
                canAccessDirectorMode={hasDirectorAccess}
              />
            </div>
          </div>

          {canShowWorkspaceNavigation && (
            <nav
              aria-label="Navegación principal"
              className={`hidden gap-2 ${desktopSidebar ? '' : 'sm:grid'}`}
              style={{
                gridTemplateColumns: `${primary.map((item) => (item.icon === 'payments' ? '3rem' : 'minmax(0,1fr)')).join(' ')}${role === 'school' ? ' 2.5rem' : ''}`,
              }}
            >
              {primary.map((l) => {
                const active = isActiveNav(l.href)
                const Icon = NAV_ICONS[l.icon]
                const count =
                  role === 'athlete' && l.href === '/athlete/schedule' ? upcomingCount : null
                const label = count === null ? l.label : `${l.label} (${count})`
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-label={label}
                    title={label}
                    aria-current={active ? 'page' : undefined}
                    className={`@container flex min-w-0 min-h-12 cursor-pointer items-center justify-center gap-1 rounded-[var(--r-sm)] border ${l.icon === 'payments' ? 'size-12 p-0' : 'px-1.5 py-3 sm:px-4'} text-center text-xs font-semibold shadow-[0_1px_0_rgba(13,44,72,0.05)] transition-[background-color,border-color,box-shadow,color,transform] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] active:translate-y-0 sm:gap-2 sm:text-sm ${
                      active
                        ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                        : 'border-[var(--c-border)] bg-white text-[var(--c-text-2)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)]'
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                    {count !== null && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-current/10 px-1 text-[10px] @min-[9rem]:hidden">
                        {count}
                      </span>
                    )}
                    {l.icon !== 'payments' && (
                      <span className="hidden whitespace-nowrap @min-[9rem]:inline">{label}</span>
                    )}
                  </Link>
                )
              })}
              {role === 'school' && (
                <Link
                  href="/school/settings"
                  aria-label="Configuración de escuela"
                  aria-current={pathname.startsWith('/school/settings') ? 'page' : undefined}
                  className={`flex min-h-12 items-center justify-center rounded-[var(--r-sm)] border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${pathname.startsWith('/school/settings') ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-text-2) hover:bg-(--c-surface)'}`}
                >
                  <FiSettings aria-hidden="true" className="size-5" />
                </Link>
              )}
            </nav>
          )}

          {canShowWorkspaceNavigation && role === 'coach' && <CoachSchoolSwitcher />}
          {canShowWorkspaceNavigation &&
            role === 'athlete' &&
            !publicAthleteSchedule &&
            !pathname.startsWith('/athlete/search') &&
            !pathname.startsWith('/athlete/training') &&
            pathname !== '/athlete/payments' &&
            pathname !== '/athlete/progress' &&
            (!tenant || selectedSchool !== null) && <AthleteSchoolSwitcher />}
        </div>
      </header>

      {desktopSidebar && canShowWorkspaceNavigation && (
        <aside
          data-app-sidebar
          className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col gap-6 overflow-y-auto border-r border-(--c-border) bg-white px-3 py-6 sm:flex"
        >
          <Link
            href="/"
            className="mx-3 block min-h-8 min-w-0 shrink-0"
            aria-label={workspaceBrand ? `${workspaceBrand.name}, inicio` : 'Nadamas, inicio'}
          >
            <WorkspaceBrand school={workspaceBrand} />
          </Link>
          <nav aria-label="Navegación principal" className="grid gap-2">
            {primary.map((item) => {
              const Icon = NAV_ICONS[item.icon]
              const active = isActiveNav(item.href)
              const count =
                role === 'athlete' && item.href === '/athlete/schedule' ? upcomingCount : null
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) ${active ? 'bg-(--c-ocean) text-white' : 'text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean)'}`}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 break-words">{item.label}</span>
                  {count !== null && count > 0 && (
                    <span className="ml-auto rounded-full bg-current/10 px-1.5 text-xs">
                      {count}
                    </span>
                  )}
                </Link>
              )
            })}
            {role === 'school' && (
              <Link
                href="/school/settings"
                aria-current={pathname.startsWith('/school/settings') ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) ${pathname.startsWith('/school/settings') ? 'bg-(--c-ocean) text-white' : 'text-(--c-text-2) hover:bg-(--c-surface)'}`}
              >
                <FiSettings aria-hidden="true" className="size-4" />
                Configuración
              </Link>
            )}
          </nav>
        </aside>
      )}

      {/* Small screens: primary nav becomes an app-style bottom tab bar. Rendered
        outside the header because its backdrop-blur would contain `fixed`. */}
      {canShowWorkspaceNavigation && (
        <nav
          aria-label="Navegación principal"
          data-app-tabbar
          className="fixed inset-x-0 bottom-0 z-30 border-t border-(--c-border) bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(10,37,64,0.06)] backdrop-blur sm:hidden"
        >
          <ul
            className="grid h-16"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map(({ href, label, icon: Icon, count }) => {
              const active = isActiveNav(href)
              return (
                <li key={href} className="min-w-0">
                  <Link
                    href={href}
                    aria-label={count === null ? label : `${label} (${count})`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${
                      active ? 'text-(--c-ocean)' : 'text-(--c-text-2) hover:text-(--c-ocean)'
                    }`}
                  >
                    <span
                      className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                        active ? 'bg-(--c-ocean) text-white' : ''
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                      {count !== null && count > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-(--c-aqua-strong) px-1 text-[10px] leading-4 text-white">
                          {count}
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </>
  )
}

function WorkspaceBrand({
  school,
}: {
  school: { name: string; logoUrl?: string | null } | null | undefined
}) {
  if (school)
    return (
      <span className="flex min-w-0 items-center gap-2">
        {school.logoUrl && (
          <Image
            src={school.logoUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-lg object-contain"
          />
        )}
        <span className="min-w-0 break-words text-lg font-extrabold leading-tight text-(--c-ocean)">
          {school.name}
        </span>
      </span>
    )
  return (
    <Image
      src="/logo-nadamas.webp"
      alt="nadamas.app"
      width={112}
      height={38}
      priority
      className="h-8 w-auto max-w-full object-contain object-left"
    />
  )
}
