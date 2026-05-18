'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiCheck, FiExternalLink, FiX } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import { CoachCRUD } from '@/firebase/coaches/main'
import type { CoachPrivate } from '@/firebase/coaches/coach.model'
import { UserCRUD } from '@/firebase/users/main'
import type { AppUser } from '@/firebase/users/user.model'
import { postAuthed } from '@/lib/client/authed-api'

type PendingReview = CoachPrivate & { coachId: string }

export default function VerifyQueue() {
  const { user } = useUser()
  const [items, setItems] = useState<PendingReview[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => CoachCRUD.listenPendingIdentityReviews(setItems), [])
  useEffect(() => UserCRUD.listenAll(setUsers), [])

  async function review(coachId: string, status: 'verified' | 'rejected') {
    setBusyId(coachId)
    const reviewedAt = Date.now()
    await CoachCRUD.reviewIdentity(coachId, {
      status,
      reviewedAt,
      reviewedBy: user?.uid || user?.id,
      adminNote:
        status === 'verified'
          ? 'Identidad validada por administración.'
          : 'Documento rechazado por administración.',
    })
    await postAuthed('/api/notifications/verification-reviewed', {
      coachId,
      status,
    })
    await CoachCRUD.reviewIdentity(coachId, {
      status,
      reviewedAt,
      reviewedBy: user?.uid || user?.id,
      adminNote:
        status === 'verified'
          ? 'Identidad validada por administración.'
          : 'Documento rechazado por administración.',
      reviewNotificationSentAt: Date.now(),
    })
    setBusyId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-10 text-center text-[var(--c-text-2)]">
          Sin solicitudes pendientes
        </div>
      ) : (
        items.map((item) => {
          const document = item.identityVerification?.document
          const coachUser = users.find((candidate) => candidate.id === item.coachId)
          const coachName =
            coachUser?.displayName ||
            coachUser?.name ||
            [coachUser?.firstName, coachUser?.lastName].filter(Boolean).join(' ') ||
            'Coach sin nombre'
          const phone =
            coachUser?.phone ||
            item.privateContacts?.find((contact) =>
              ['phone', 'whatsapp'].includes(contact.type.toLowerCase())
            )?.value

          return (
            <article
              key={item.coachId}
              className="grid gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)] sm:grid-cols-[96px_1fr_auto] sm:items-center"
            >
              {document?.url ? (
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative h-24 w-24 overflow-hidden rounded-2xl bg-[var(--c-surface)]"
                >
                  <Image
                    src={document.url}
                    alt="INE por revisar"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </a>
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-[var(--c-surface)]" />
              )}

              <div className="min-w-0">
                <p className="font-bold text-[var(--c-ocean)]">{coachName}</p>
                <p className="mt-1 text-sm text-[var(--c-text-2)]">
                  {phone || 'Teléfono no registrado'}
                </p>
                <p className="mt-1 truncate text-sm text-[var(--c-text-2)]">
                  {document?.name || 'Documento sin nombre'}
                </p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <Link
                    href={`/admin/users/${item.coachId}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-ocean-mid)]"
                  >
                    Ver perfil
                  </Link>
                  {document?.url && (
                    <>
                      <Link
                        href={`/admin/verify-queue/${item.coachId}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-ocean-mid)]"
                      >
                        Revisar perfil
                      </Link>
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-ocean-mid)]"
                      >
                        Ver documento <FiExternalLink aria-hidden="true" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === item.coachId}
                  onClick={() => review(item.coachId, 'rejected')}
                  className="btn btn-outline btn-sm gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <FiX aria-hidden="true" />
                  Rechazar
                </button>
                <button
                  type="button"
                  disabled={busyId === item.coachId}
                  onClick={() => review(item.coachId, 'verified')}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <FiCheck aria-hidden="true" />
                  Validar
                </button>
              </div>
            </article>
          )
        })
      )}
    </div>
  )
}
