'use client'

import { usePathname } from 'next/navigation'
import { useTenantSchool } from '@/context/TenantSchoolContext'

import SchoolWorkspaceTabs from './SchoolWorkspaceTabs'
import { useSchoolSelection } from './useSchoolSelection'

export default function AthleteSchoolSwitcher() {
  const tenant = useTenantSchool()
  return tenant ? null : <GlobalAthleteSchoolSwitcher />
}

function GlobalAthleteSchoolSwitcher() {
  const pathname = usePathname()
  const payments = pathname === '/athlete/payments'
  const { schools, selectedId, status, selectSchool, selectPersonal } = useSchoolSelection({
    includePersonal: true,
    athleteMode: true,
  })
  if (status !== 'ready') return null
  return (
    <SchoolWorkspaceTabs
      schools={schools.map(({ school }) => ({ id: school.id, name: school.name }))}
      selectedId={selectedId}
      personalLabel={payments ? 'Coaches independientes' : 'Todos'}
      description={
        payments
          ? 'Elige con quién consultar tus planes y pagos.'
          : 'Horarios de tus escuelas o coaches disponibles.'
      }
      onChange={(id) => (id ? selectSchool(id) : selectPersonal())}
    />
  )
}
