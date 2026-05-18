'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import type { CoachPrivate, CoachPublic } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { coachMissingItems } from '@/lib/coach-completeness'

export default function CoachOnboardingBanner() {
  const { user } = useUser() as {
    user: { uid?: string; id?: string; firstName?: string; lastName?: string } | null
  }
  const uid = user?.uid || user?.id
  const [pub, setPub] = useState<CoachPublic | null | undefined>(undefined)
  const [priv, setPriv] = useState<CoachPrivate | null | undefined>(undefined)

  useEffect(() => {
    if (!uid) return
    const u1 = CoachCRUD.listenPublic(uid, setPub)
    const u2 = CoachCRUD.listenPrivate(uid, setPriv)
    return () => {
      u1?.()
      u2?.()
    }
  }, [uid])

  // Stay silent until we know, and once the profile is complete.
  if (!uid || pub === undefined || priv === undefined) return null

  const missing = coachMissingItems({
    pub,
    priv,
    firstName: user?.firstName,
    lastName: user?.lastName,
  })
  if (missing.length === 0) return null

  return (
    <div
      className="flex flex-col gap-4 rounded-[var(--r-md)] p-6 text-white shadow-[var(--shadow-md)] sm:flex-row sm:items-center sm:justify-between"
      style={{ background: 'var(--grad-brand)' }}
    >
      <div>
        <h2 className="text-xl font-extrabold">
          Completa tu perfil de coach para comenzar a dar clase
        </h2>
        <p className="mt-1 text-sm text-white/85">
          Te {missing.length === 1 ? 'falta' : 'faltan'} {missing.length}{' '}
          {missing.length === 1 ? 'cosa' : 'cosas'}: {missing.join(' · ')}. Sin esto tu perfil no
          aparece en el marketplace.
        </p>
      </div>
      <Link
        href="/coach/coach-profile"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--c-ocean)] transition hover:-translate-y-0.5"
      >
        Completar perfil
        <FiArrowRight aria-hidden="true" />
      </Link>
    </div>
  )
}
