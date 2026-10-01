'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiArrowRight, FiMail } from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'

interface SchoolInvitationItem {
  id: string
  schoolName: string
  role: 'teacher' | 'guardian' | 'student'
  status: 'pending' | 'expired'
  expiresAt: number
}

const ROLE_LABEL = {
  teacher: 'Coach',
  guardian: 'Padre, madre o tutor',
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

  return (
    <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--c-surface)] text-[var(--c-aqua-strong)]">
          <FiMail aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-bold text-[var(--c-ocean)]">Invitaciones escolares</h2>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">
            Aquí aparecen las invitaciones enviadas a tu correo.
          </p>
        </div>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-[var(--c-text-2)]">Cargando invitaciones…</p>
      ) : invitations.length === 0 ? (
        <p className="mt-4 rounded-[var(--r-sm)] bg-[var(--c-surface)] p-3 text-sm text-[var(--c-text-2)]">
          No tienes invitaciones escolares pendientes.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-sm)] bg-[var(--c-surface)] p-3"
            >
              <div>
                <p className="font-bold text-[var(--c-ocean)]">{invitation.schoolName}</p>
                <p className="mt-0.5 text-xs text-[var(--c-text-2)]">
                  {ROLE_LABEL[invitation.role]} ·{' '}
                  {invitation.status === 'pending' ? 'Expira en 7 días' : 'Expirada'}
                </p>
              </div>
              {invitation.status === 'pending' && (
                <Link
                  href={`/school/invitations/${invitation.id}`}
                  className="inline-flex items-center gap-1 text-sm font-bold text-[var(--c-aqua-strong)] hover:underline"
                >
                  Revisar <FiArrowRight aria-hidden="true" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
