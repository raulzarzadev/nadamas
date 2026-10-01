'use client'

import Link from 'next/link'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'

export default function SchoolPublicActions() {
  const { user } = useUser() as { user: unknown }
  const { activeRole } = useRole()

  if (!user) {
    return (
      <Link
        href="/login"
        className="btn min-h-12 border-0 px-7 text-white"
        style={{ backgroundColor: 'var(--school-primary)' }}
      >
        Iniciar sesión
      </Link>
    )
  }

  const isSchoolMode = activeRole === 'school'
  return (
    <Link
      href={isSchoolMode ? '/school/classes' : '/athlete/bookings'}
      className="btn min-h-12 border-0 px-7 text-white"
      style={{ backgroundColor: 'var(--school-primary)' }}
    >
      {isSchoolMode ? 'Ir a mi escuela' : 'Ver mis próximas clases'}
    </Link>
  )
}
