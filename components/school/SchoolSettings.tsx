'use client'

import { useSearchParams } from 'next/navigation'
import { Children, isValidElement, type ReactNode, useEffect, useState } from 'react'
import { FiCalendar, FiChevronDown, FiGlobe, FiHome, FiLink } from 'react-icons/fi'
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
  const requestedSchoolId = useSearchParams().get('schoolId')
  useEffect(() => {
    if (
      status === 'ready' &&
      requestedSchoolId &&
      requestedSchoolId !== selectedId &&
      schools.some((item) => item.school.id === requestedSchoolId)
    )
      selectSchool(requestedSchoolId)
  }, [status, requestedSchoolId, selectedId, schools, selectSchool])
  useEffect(() => {
    if (
      status !== 'ready' ||
      !requestedSchoolId ||
      requestedSchoolId !== selectedId ||
      window.location.hash !== '#apariencia'
    )
      return
    const frame = requestAnimationFrame(() => {
      const group = document.getElementById('school-page-settings')
      if (group instanceof HTMLDetailsElement) group.open = true
      document.getElementById('apariencia')?.scrollIntoView()
    })
    return () => cancelAnimationFrame(frame)
  }, [status, requestedSchoolId, selectedId])

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
      <SettingsGroup
        title="Tu escuela"
        description="Datos e instalaciones"
        icon={<FiHome aria-hidden="true" />}
      >
        {canManage && (
          <SchoolSettingsForm school={school} canEditSlug={canEditSlug} onUpdated={setSchool} />
        )}
        <SchoolLocationsCard schoolId={school.id} canManage={canManage} />
      </SettingsGroup>
      <SettingsGroup
        id="school-page-settings"
        title="Página de tu escuela"
        description="Apariencia"
        icon={<FiGlobe aria-hidden="true" />}
      >
        {canManage && <SchoolHomeAppearanceCard school={school} onUpdated={setSchool} />}
      </SettingsGroup>
      <SettingsGroup
        title="Eventos y enlaces"
        description="Eventos, redes y contactos"
        icon={<FiLink aria-hidden="true" />}
      >
        {canManage && <SchoolEventsCard schoolId={school.id} />}
        <SchoolContactsCard school={school} canManage={canManage} onUpdated={setSchool} />
      </SettingsGroup>
      <SettingsGroup
        title="Reservas y calendario"
        description="Solicitudes y sincronización"
        icon={<FiCalendar aria-hidden="true" />}
      >
        {canManage && (
          <SchoolBookingSettingsCard
            schoolId={school.id}
            mode={school.bookingMode || 'request'}
            onChange={(bookingMode) => setSchool((current) => ({ ...current, bookingMode }))}
          />
        )}
        <SchoolCalendarCard schoolId={school.id} />
      </SettingsGroup>
    </>
  )
}

function SettingsGroup({
  id,
  title,
  description,
  icon,
  children,
}: {
  id?: string
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <details
      id={id}
      className="group min-w-0 overflow-hidden rounded-xl border border-(--c-border) bg-white"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--c-aqua-strong) [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--c-surface)">
          {icon}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="font-bold">{title}</span>
          <span className="text-xs text-(--c-text-2)">{description}</span>
        </span>
        <FiChevronDown
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="min-w-0">
        {Children.toArray(children).map((child) => (
          <div
            key={isValidElement(child) ? child.key : String(child)}
            className="border-t border-(--c-border) first:border-t-0 [&>section]:rounded-none! [&>section]:border-0! [&>section]:shadow-none!"
          >
            {child}
          </div>
        ))}
      </div>
    </details>
  )
}
