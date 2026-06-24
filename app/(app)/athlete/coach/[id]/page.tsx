'use client'
import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import Loading from '@comps/Loading'
import { use, useEffect, useState } from 'react'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import type { PublicBlockedSlot, PublicBookedSlot, PublicOpenSlot } from '@/lib/coach-booking'

interface CoachDetail {
  coach: CoachPublic
  name: string
  avatarUrl: string | null
  bookedSlots?: PublicBookedSlot[]
  openSlots?: PublicOpenSlot[]
  blockedSlots?: PublicBlockedSlot[]
}

export default function AthleteCoachView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [detail, setDetail] = useState<CoachDetail | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    fetch(`/api/public/coaches/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active) return
        setDetail(payload?.coach ? (payload as CoachDetail) : null)
      })
      .catch(() => active && setDetail(null))
    return () => {
      active = false
    }
  }, [id])

  if (detail === undefined) return <Loading />
  if (detail === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Coach</h1>
        <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-10 text-center text-[var(--c-text-2)]">
          Perfil no disponible
        </div>
      </div>
    )
  }

  return (
    <CoachPublicProfile
      coach={detail.coach}
      name={detail.name}
      avatarUrl={detail.avatarUrl}
      bookedSlots={detail.bookedSlots || []}
      openSlots={detail.openSlots || []}
      blockedSlots={detail.blockedSlots || []}
    />
  )
}
