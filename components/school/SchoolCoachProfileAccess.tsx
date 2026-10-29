'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import CoachProfileEditor from '@/components/coach/CoachProfileEditor'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useRole } from '@/context/RoleContext'

export default function SchoolCoachProfileAccess() {
  const { activeRole, activeRolePreferenceReady } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (activeRolePreferenceReady && activeRole !== 'school') router.replace('/school')
  }, [activeRole, activeRolePreferenceReady, router])

  if (!activeRolePreferenceReady || activeRole !== 'school') return <ProfileLoadingSkeleton />

  return (
    <div className="grid gap-4">
      <Link href="/school" className="min-h-11 justify-self-start text-sm font-bold underline">
        Regresar a Inicio
      </Link>
      <CoachProfileEditor />
    </div>
  )
}
