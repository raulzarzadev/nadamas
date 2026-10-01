'use client'

import Link from 'next/link'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { useSchoolSelection } from './useSchoolSelection'

export default function TenantWorkspaceGate({
  mode,
  children,
}: {
  mode: 'athlete' | 'coach' | 'school'
  children: React.ReactNode
}) {
  const tenant = useTenantSchool()
  if (!tenant) return children
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
  if (!tenant) return children
  if (status === 'loading') return <p className="py-12 text-center">Cargando escuela…</p>
  if (!selected)
    return (
      <div className="grid gap-3 rounded-[var(--r-md)] border border-(--c-border) bg-white p-6">
        <h1 className="text-xl font-extrabold">{tenant.name}</h1>
        <p>No tienes acceso a este modo en esta escuela.</p>
        <Link href="/" className="btn btn-primary">
          Ver escuela
        </Link>
      </div>
    )
  return children
}
