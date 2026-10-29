'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { type School, schoolMembershipHasRole } from '@/lib/school'
import SchoolBookingSettingsCard from './SchoolBookingSettingsCard'
import SchoolCalendarCard from './SchoolCalendarCard'
import SchoolContactsCard from './SchoolContactsCard'
import SchoolEventsCard from './SchoolEventsCard'
import SchoolHomeAppearanceCard from './SchoolHomeAppearanceCard'
import SchoolLocationsCard from './SchoolLocationsCard'
import SchoolNoSelection from './SchoolNoSelection'
import SchoolSelector from './SchoolSelector'
import SchoolSettingsForm from './SchoolSettingsForm'
import { useSchoolSelection } from './useSchoolSelection'

export default function SchoolSettings() {
  const { schools, selected, selectedId, status, selectSchool } = useSchoolSelection()
  const { isAdmin } = useRole()

  if (status === 'loading')
    return <p className="text-sm text-(--c-text-2)">Cargando configuración…</p>
  if (status === 'error')
    return (
      <p className="text-sm text-(--c-text-2)">
        No se pudo cargar la configuración. Inténtalo de nuevo.
      </p>
    )
  if (!selected) return <SchoolNoSelection />

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <SchoolSelector schools={schools} selectedId={selectedId || ''} onChange={selectSchool} />
        <Link
          href="/school/create"
          className="inline-flex min-h-11 items-center text-sm font-bold underline focus-visible:outline-2"
        >
          Crear otra escuela
        </Link>
      </div>
      <SettingsContent
        key={selected.school.id}
        initialSchool={selected.school}
        canManage={schoolMembershipHasRole(selected.membership, 'director')}
        canEditSlug={isAdmin}
      />
    </div>
  )
}

function SettingsContent({
  initialSchool,
  canManage,
  canEditSlug,
}: {
  initialSchool: School
  canManage: boolean
  canEditSlug: boolean
}) {
  const [school, setSchool] = useState(initialSchool)
  return (
    <>
      <h1 className="font-bold text-(--c-ocean)">Configuración de escuela</h1>
      <Link
        href="/school/subscription"
        className="flex min-h-14 items-center justify-between gap-3 bg-white p-4 font-bold text-(--c-ocean) sm:rounded-xl focus-visible:outline-2"
      >
        <span>
          Suscripción de Nadamas
          <span className="mt-1 block text-xs font-normal text-(--c-text-2)">
            Estado, pagos y código promocional de tu escuela.
          </span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      {canManage && (
        <SchoolSettingsForm school={school} canEditSlug={canEditSlug} onUpdated={setSchool} />
      )}
      {canManage && (
        <SchoolBookingSettingsCard
          schoolId={school.id}
          mode={school.bookingMode || 'request'}
          onChange={(bookingMode) => setSchool((current) => ({ ...current, bookingMode }))}
        />
      )}
      <SchoolCalendarCard schoolId={school.id} />
      {canManage && <SchoolEventsCard schoolId={school.id} />}
      {canManage && <SchoolHomeAppearanceCard school={school} onUpdated={setSchool} />}
      <SchoolLocationsCard schoolId={school.id} canManage={canManage} />
      <SchoolContactsCard school={school} canManage={canManage} onUpdated={setSchool} />
    </>
  )
}
