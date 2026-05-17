'use client'
import { use, useEffect, useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import Loading from '@comps/Loading'

export default function AthleteCoachView({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [coach, setCoach] = useState<CoachPublic | null | undefined>(undefined)

  useEffect(() => {
    const unsub = CoachCRUD.listenPublic(id, setCoach)
    return () => {
      unsub && unsub()
    }
  }, [id])

  if (coach === undefined) return <Loading />
  if (coach === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Coach</h1>
        <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
          Perfil no disponible
        </div>
      </div>
    )
  }

  return <CoachPublicProfile coach={coach} />
}
