'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiShield, FiUser } from 'react-icons/fi'
import type { AppUser } from '@/firebase/users/user.model'
import type { CoachPrivate, CoachPublic } from '@/firebase/coaches/coach.model'
import { deleteAuthed, getAuthed, patchAuthed } from '@/lib/client/authed-api'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import Loading from '@comps/Loading'
import CoachPublicProfile from '@comps/coach/CoachPublicProfile'

interface UserSummary {
  user: AppUser | null
  auth: {
    disabled: boolean
    emailVerified: boolean
    lastSignInTime?: string
    creationTime?: string
  } | null
  coach: CoachPublic | null
  coachPrivate: CoachPrivate | null
  athleteSummary: {
    classesTaken: number
    coaches: Array<{ id: string; name: string }>
  }
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [summary, setSummary] = useState<UserSummary | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      const response = await getAuthed(`/api/admin/users/${id}`)
      const payload = (await response.json()) as UserSummary
      setSummary(payload)
    } catch (loadError) {
      reportInternalError('ADMIN_USER_DETAIL', loadError)
      setSummary(null)
      setError(GENERIC_USER_ERROR)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  async function toggleDisabled() {
    if (!summary?.auth) return
    setBusy(true)
    await patchAuthed(`/api/admin/users/${id}`, {
      disabled: !summary.auth.disabled,
    })
    await load()
    setBusy(false)
  }

  async function deleteUser() {
    setDeleting(true)
    try {
      await deleteAuthed(`/api/admin/users/${id}`)
      window.location.href = '/admin/users'
    } catch (deleteError) {
      reportInternalError('ADMIN_USER_DELETE', deleteError)
      setError(GENERIC_USER_ERROR)
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  if (summary === undefined) return <Loading />
  if (!summary?.user) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-6 text-[var(--c-text-2)] shadow-[var(--shadow-sm)]">
        <p>{error || 'Usuario no disponible.'}</p>
        {error && (
          <button type="button" onClick={() => void load()} className="btn btn-outline btn-sm mt-4">
            Reintentar
          </button>
        )}
      </div>
    )
  }

  const identity = summary.coachPrivate?.identityVerification

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/users"
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--c-ocean-mid)]"
      >
        <FiArrowLeft aria-hidden="true" />
        Volver a usuarios
      </Link>

      <section className="grid gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)] lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="flex gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--c-surface)] text-[var(--c-ocean-mid)]">
            <FiUser aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">
              {summary.user.displayName || summary.user.name || 'Usuario sin nombre'}
            </h1>
            <p className="text-[var(--c-text-2)]">{summary.user.email || summary.user.id}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-[var(--c-surface)] px-3 py-1">
                Cuenta {summary.auth?.disabled ? 'deshabilitada' : 'activa'}
              </span>
      {!!summary.coach && (
                <span className="rounded-full bg-[var(--c-surface)] px-3 py-1">
                  Coach
                </span>
              )}
              {identity?.status && (
                <span className="rounded-full bg-[var(--c-surface)] px-3 py-1">
                  Verificación: {identity.status}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col gap-2 self-start sm:flex-row">
          <button
            type="button"
            disabled={busy || !summary.auth}
            onClick={toggleDisabled}
            className="btn btn-outline"
          >
            {busy
              ? 'Guardando…'
              : summary.auth?.disabled
                ? 'Reactivar cuenta'
                : 'Deshabilitar cuenta'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="btn border-red-200 bg-white text-red-600 hover:bg-red-50"
          >
            Eliminar usuario
          </button>

          {confirmingDelete && (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-10 w-[min(24rem,calc(100vw-2rem))] rounded-[var(--r-md)] border border-red-200 bg-red-50 p-4 shadow-[var(--shadow-md)]">
              <h2 className="font-bold text-red-700">Eliminar usuario definitivamente</h2>
              <p className="mt-2 text-sm text-red-700">
                Elimina acceso, perfil y datos asociados conocidos. No se puede deshacer.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void deleteUser()}
                  className="btn btn-sm border-red-600 bg-red-600 text-white hover:bg-red-700"
                >
                  {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-semibold text-[var(--c-text-2)]">Clases tomadas</p>
          <p className="mt-2 text-3xl font-extrabold">{summary.athleteSummary.classesTaken}</p>
        </article>
        <article className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)] md:col-span-2">
          <p className="text-sm font-semibold text-[var(--c-text-2)]">Coaches con quienes entrenó</p>
          {summary.athleteSummary.coaches.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {summary.athleteSummary.coaches.map((coach) => (
                <li key={coach.id} className="rounded-full bg-[var(--c-surface)] px-3 py-1">
                  {coach.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--c-text-2)]">Aún no hay clases registradas.</p>
          )}
        </article>
      </section>

      <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-4 flex items-center gap-2">
          <FiShield aria-hidden="true" />
          <h2 className="text-xl font-bold">Verificación de coach</h2>
        </div>
        {identity ? (
          <div className="grid gap-3 text-sm text-[var(--c-text-2)] sm:grid-cols-2">
            <p>Estado: {identity.status}</p>
            <p>Solicitud enviada: {identity.notificationSentAt ? 'Sí' : 'No registrada'}</p>
            <p>Documento: {identity.document?.name || 'Sin documento'}</p>
            <p>Resultado notificado: {identity.reviewNotificationSentAt ? 'Sí' : 'No registrado'}</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--c-text-2)]">No ha solicitado verificación como coach.</p>
        )}
      </section>

      {!!summary.coach && (
        <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Perfil público de coach</h2>
            <Link
              href={`/admin/coaches/${id}/schedule`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--c-aqua)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Ver y editar horarios
            </Link>
          </div>
          <CoachPublicProfile coach={summary.coach} />
        </section>
      )}
    </div>
  )
}
