'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiChevronRight, FiMail } from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'

interface SchoolInvitationItem {
  id: string
  schoolName: string
  role: 'teacher' | 'student'
  status: 'pending' | 'expired'
  expiresAt: number
}

const ROLE_LABEL = {
  teacher: 'Coach',
  student: 'Alumno',
} as const

export default function SchoolInvitations() {
  const [invitations, setInvitations] = useState<SchoolInvitationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuthed('/api/school-invitations')
      .then((response) => response.json() as Promise<{ invitations?: SchoolInvitationItem[] }>)
      .then((payload) => setInvitations(payload.invitations || []))
      .catch(() => setInvitations([]))
      .finally(() => setLoading(false))
  }, [])

  // Same look as "Solicitudes pendientes"; hidden while loading or when nothing is pending.
  const pending = invitations.filter((invitation) => invitation.status === 'pending')
  if (loading || !pending.length) return null
  return (
    <section
      aria-label="Invitaciones escolares"
      className="overflow-hidden rounded-[var(--r-md)] border border-(--c-border) bg-white"
    >
      <p className="px-3 pt-3 pb-1 text-xs font-bold tracking-wide text-(--c-text-2) uppercase">
        Invitaciones escolares
      </p>
      {pending.map((invitation) => {
        const days = Math.max(1, Math.ceil((invitation.expiresAt - Date.now()) / 86_400_000))
        return (
          <Link
            key={invitation.id}
            href={`/${invitation.role === 'teacher' ? 'coach' : invitation.role === 'student' ? 'athlete' : 'school'}/invitations/${invitation.id}`}
            className="flex items-center gap-3 px-3 py-3 hover:bg-(--c-surface)"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-aqua-strong)">
              <FiMail aria-hidden="true" />
            </span>
            <span className="grid min-w-0 flex-1">
              <span className="truncate text-sm font-bold text-(--c-ocean)">
                {invitation.schoolName}
              </span>
              <span className="truncate text-xs text-(--c-text-2)">
                Invitación como {ROLE_LABEL[invitation.role]} · Expira en {days}{' '}
                {days === 1 ? 'día' : 'días'}
              </span>
            </span>
            <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
          </Link>
        )
      })}
    </section>
  )
}
