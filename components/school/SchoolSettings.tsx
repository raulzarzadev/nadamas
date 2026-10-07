'use client'

import { useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { type School, schoolMembershipHasRole } from '@/lib/school'
import SchoolBookingSettingsCard from './SchoolBookingSettingsCard'
import SchoolCalendarCard from './SchoolCalendarCard'
import SchoolContactsCard from './SchoolContactsCard'
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
      <SchoolSelector schools={schools} selectedId={selectedId || ''} onChange={selectSchool} />
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
      <SchoolLocationsCard schoolId={school.id} canManage={canManage} />
      <SchoolContactsCard school={school} canManage={canManage} onUpdated={setSchool} />
    </>
  )
}
