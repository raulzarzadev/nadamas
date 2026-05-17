'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowLeft, FiCheck, FiExternalLink, FiX } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import { CoachCRUD } from '@/firebase/coaches/main'
import type {
  CoachPrivate,
  CoachPublic,
} from '@/firebase/coaches/coach.model'
import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import Loading from '@comps/Loading'
import { postAuthed } from '@/lib/client/authed-api'

export default function VerifyCoachPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user } = useUser()
  const [coach, setCoach] = useState<CoachPublic | null | undefined>()
  const [privateProfile, setPrivateProfile] = useState<
    CoachPrivate | null | undefined
  >()
  const [busy, setBusy] = useState(false)

  useEffect(() => CoachCRUD.listenPublic(id, setCoach), [id])
  useEffect(() => CoachCRUD.listenPrivate(id, setPrivateProfile), [id])

  async function review(status: 'verified' | 'rejected') {
    setBusy(true)
    await CoachCRUD.reviewIdentity(id, {
      status,
      reviewedAt: Date.now(),
      reviewedBy: user?.uid || user?.id,
      adminNote:
        status === 'verified'
          ? 'Identidad validada por administración.'
          : 'Documento rechazado por administración.',
    })
    await postAuthed('/api/notifications/verification-reviewed', {
      coachId: id,
      status,
    })
    setBusy(false)
  }

  if (coach === undefined || privateProfile === undefined) return <Loading />

  const document = privateProfile?.identityVerification?.document

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/verify-queue"
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--c-ocean-mid)]"
      >
        <FiArrowLeft aria-hidden="true" />
        Volver a verificaciones
      </Link>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)] sm:p-6">
          <h1 className="mb-5 text-2xl font-extrabold">Perfil del coach</h1>
          {coach ? (
            <CoachPublicProfile coach={coach} />
          ) : (
            <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] p-8 text-center text-[var(--c-text-2)]">
              Perfil público no disponible
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)] xl:sticky xl:top-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--c-text-2)]">
              Revisión
            </p>
            <h2 className="mt-1 text-xl font-bold">Documento INE</h2>
          </div>

          {document?.url ? (
            <>
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--c-surface)]"
              >
                <Image
                  src={document.url}
                  alt="INE por revisar"
                  fill
                  className="object-cover"
                />
              </a>
              <p className="break-all text-sm text-[var(--c-text-2)]">
                {document.name}
              </p>
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--c-ocean-mid)]"
              >
                Abrir documento completo <FiExternalLink aria-hidden="true" />
              </a>
            </>
          ) : (
            <p className="rounded-2xl bg-[var(--c-surface)] p-4 text-sm text-[var(--c-text-2)]">
              No hay documento cargado.
            </p>
          )}

          <div className="grid gap-2 pt-2">
            <button
              type="button"
              disabled={busy || !document}
              onClick={() => review('verified')}
              className="btn btn-primary gap-2"
            >
              <FiCheck aria-hidden="true" />
              Validar identidad
            </button>
            <button
              type="button"
              disabled={busy || !document}
              onClick={() => review('rejected')}
              className="btn btn-outline gap-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              <FiX aria-hidden="true" />
              Rechazar documento
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
