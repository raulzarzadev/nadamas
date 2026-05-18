'use client'
import Loading from '@comps/Loading'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import type { CoachPrivate, CoachPublic } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { coachMissingItems } from '@/lib/coach-completeness'

/**
 * Blocks coach-only tools (alumnos, agenda) until the coach profile is
 * complete. The profile page itself must NOT use this.
 */
export default function CoachProfileGate({ children }: { children: React.ReactNode }) {
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

  if (!uid || pub === undefined || priv === undefined) return <Loading />

  const missing = coachMissingItems({
    pub,
    priv,
    firstName: user?.firstName,
    lastName: user?.lastName,
  })

  if (missing.length === 0) return <>{children}</>

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <h1 className="text-2xl font-extrabold">Completa tu perfil primero</h1>
        <p className="mt-2 text-[var(--c-text-2)]">
          Para usar esta sección necesitas terminar tu perfil de coach. Te
          {missing.length === 1 ? ' falta' : ' faltan'} {missing.length}{' '}
          {missing.length === 1 ? 'cosa' : 'cosas'}:
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {missing.map((item) => (
            <li
              key={item}
              className="rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm text-[var(--c-text-2)]"
            >
              {item}
            </li>
          ))}
        </ul>
        <Link
          href="/coach/coach-profile"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--c-aqua)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)]"
        >
          Ir a mi perfil de coach
        </Link>
      </div>
    </div>
  )
}
