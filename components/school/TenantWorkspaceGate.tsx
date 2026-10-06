'use client'

import { usePathname } from 'next/navigation'
import { useRole } from '@/context/RoleContext'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { SchoolAccessRequestCard } from './SchoolAccessRequests'
import { useSchoolSelection } from './useSchoolSelection'

export default function TenantWorkspaceGate({
  mode,
  children,
}: {
  mode: 'athlete' | 'coach' | 'school'
  children: React.ReactNode
}) {
  const tenant = useTenantSchool()
  const pathname = usePathname()
  if (!tenant) return children
  // Public entry points remain available before an athlete joins the tenant.
  if (
    mode === 'athlete' &&
    (pathname === '/athlete/find-coach' || pathname.startsWith('/athlete/invitations/'))
  )
    return children
  return <ScopedWorkspaceGate mode={mode}>{children}</ScopedWorkspaceGate>
}

function ScopedWorkspaceGate({
  mode,
  children,
}: {
  mode: 'athlete' | 'coach' | 'school'
  children: React.ReactNode
}) {
  const tenant = useTenantSchool()
  const { selected, status } = useSchoolSelection({
    includePersonal: mode !== 'school',
    athleteMode: mode === 'athlete',
  })
  const { setActiveRole } = useRole()
  if (!tenant) return children
  if (status === 'loading') return <p className="py-12 text-center">Cargando escuela…</p>
  if (status === 'error')
    return (
      <p role="alert">
        No pudimos cargar tu acceso.{' '}
        <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
          Volver a intentar
        </button>
      </p>
    )
  if (!selected && mode === 'athlete')
    return <SchoolAccessRequestCard schoolId={tenant.id} schoolName={tenant.name} />
  if (!selected)
    return (
      <div className="grid gap-3 rounded-[var(--r-md)] border border-(--c-border) bg-white p-6">
        <h1 className="text-xl font-extrabold">{tenant.name}</h1>
        <p>
          {mode === 'coach'
            ? 'No eres entrenador de esta escuela.'
            : 'No tienes acceso a este modo en esta escuela.'}
        </p>
        {mode === 'coach' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveRole('athlete')}
          >
            Cambiar a modo alumno
          </button>
        )}
      </div>
    )
  return children
}
