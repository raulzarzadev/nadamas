'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'

export default function SchoolPublicActions({
  schoolId,
  authenticatedLabel,
}: {
  schoolId: string
  authenticatedLabel?: string
}) {
  const router = useRouter()
  useSchoolAgendaUpdates(schoolId, () => router.refresh())
  const { user } = useUser() as { user: unknown }
  const { activeRole } = useRole()

  if (user === undefined) return null
  if (!user) return null

  const isSchoolMode = activeRole === 'school'
  const href = isSchoolMode ? '/school/classes' : '/athlete/bookings'
  const label = authenticatedLabel || (isSchoolMode ? 'Ir a mi escuela' : 'Ver mis próximas clases')
  return (
    <Link
      href={href}
      className="btn min-h-12 border-0 px-7 text-white"
      style={{ backgroundColor: 'var(--school-primary)' }}
    >
      {label}
    </Link>
  )
}
