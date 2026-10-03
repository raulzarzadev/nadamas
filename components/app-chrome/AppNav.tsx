'use client'
import CoachSchoolSwitcher from '@comps/coach/CoachSchoolSwitcher'
import AthleteSchoolSwitcher from '@comps/school/AthleteSchoolSwitcher'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FiBarChart2,
  FiBell,
  FiCalendar,
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
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { getAuthed } from '@/lib/client/authed-api'
import type { RoleName } from '@/lib/roles'
import { capitalizeSchoolTerm, type School, type SchoolMembership } from '@/lib/school'
import { schoolsForWorkspace } from '@/lib/school-workspace'
import NotificationsBell from './NotificationsBell'
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
  bell: FiBell,
}

// Shared top bar: logo + role pill + the two primary destinations as a
// segmented toggle. Rendered inside the app shell and on marketing pages for
// logged-in users so the chrome is identical everywhere. When no `role` is
// passed it follows the active role from RoleContext.
export default function AppNav({ mode: modeProp }: { mode?: RoleName }) {
  const tenant = useTenantSchool()
  const { activeRole, roles } = useRole()
  const terminology = useSchoolTerminology()
  const role = modeProp ?? activeRole
  const pathname = usePathname()
  const schoolPathname = role === 'school' ? pathname : ''
  const { selected: selectedSchool, status: schoolSelectionStatus } = useSchoolSelection({
    includePersonal: role === 'coach' || role === 'athlete',
    athleteMode: role === 'athlete',
  })
  const publicAthleteSchedule = role === 'athlete' && pathname === '/athlete/find-coach'
  const primary = PRIMARY_NAV_BY_ROLE[role].map((item) => {
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
  const hasDirectorAccess = Boolean(
    schoolAccess?.membership.status === 'active' &&
      (schoolAccess.membership.roles?.includes('director') ||
        schoolAccess.membership.role === 'director')
  )
  const canShowWorkspaceNavigation =
    (role !== 'coach' || roles.coach) &&
    (role !== 'school' || hasDirectorAccess) &&
    (!tenant ||
      publicAthleteSchedule ||
      (schoolSelectionStatus === 'ready' && selectedSchool !== null))

  useEffect(() => {
    if (!tenant && role === 'school' && !schoolPathname.startsWith('/school/')) return

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
          if (active) setSchoolAccess(null)
        })
    }

    refreshSchoolAccess()
    window.addEventListener('nadamas:school-access-updated', refreshSchoolAccess)

    return () => {
      active = false
      window.removeEventListener('nadamas:school-access-updated', refreshSchoolAccess)
    }
  }, [role, schoolPathname, tenant])

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--c-border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className={tenant ? 'min-w-0 flex-1' : 'relative block h-7 w-24 shrink-0 sm:w-28'}
          >
            {tenant ? (
              <span className="flex min-w-0 items-center gap-2">
                {tenant.logoUrl ? (
                  <Image
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-lg object-contain"
                  />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-(--c-surface) text-lg font-extrabold">
                    {tenant.name[0]}
                  </span>
                )}
                <span className="max-w-32 truncate text-sm font-extrabold sm:max-w-64">
                  {tenant.name}
                </span>
              </span>
            ) : (
              <Image
                src="/logo-nadamas.webp"
                fill
                sizes="112px"
                priority
                style={{ objectFit: 'contain', objectPosition: 'left' }}
                alt="Nadamas logo"
              />
            )}
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

        {role === 'school' && schoolAccess && (
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-left text-sm font-bold text-[var(--c-ocean)]">
              <span className="font-normal text-[var(--c-text-2)]">Escuela · </span>
              {schoolAccess.school.name}
            </p>
          </div>
        )}

        {canShowWorkspaceNavigation && (
          <nav
            aria-label="Navegación principal"
            className={`grid gap-2 ${role === 'school' ? 'grid-cols-[repeat(3,minmax(0,1fr))_3rem]' : role === 'athlete' ? 'grid-cols-2' : 'grid-cols-3'}`}
          >
            {primary.map((l) => {
              const active = pathname.startsWith(l.href)
              const Icon = NAV_ICONS[l.icon]
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-12 cursor-pointer items-center justify-center gap-1 rounded-[var(--r-sm)] border px-1.5 py-3 text-center text-xs font-semibold shadow-[0_1px_0_rgba(13,44,72,0.05)] transition-[background-color,border-color,box-shadow,color,transform] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] active:translate-y-0 sm:gap-2 sm:px-4 sm:text-sm ${
                    active
                      ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                      : 'border-[var(--c-border)] bg-white text-[var(--c-text-2)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)]'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="min-w-0 truncate sm:hidden">{l.mobileLabel}</span>
                  <span className="hidden min-w-0 truncate sm:inline">{l.label}</span>
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
        {canShowWorkspaceNavigation && role === 'athlete' && !publicAthleteSchedule && (
          <AthleteSchoolSwitcher />
        )}
        {publicAthleteSchedule && <div id="athlete-coach-filters" className="min-w-0" />}
      </div>
    </header>
  )
}
