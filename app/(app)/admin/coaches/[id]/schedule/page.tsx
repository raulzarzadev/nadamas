'use client'

import CoachAgenda from '@comps/coach/CoachAgenda'
import Loading from '@comps/Loading'
import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi'
import type { AppUser } from '@/firebase/users/user.model'
import { getAuthed } from '@/lib/client/authed-api'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

interface UserSummary {
  user: AppUser | null
}

export default function AdminCoachSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [name, setName] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)

  useEffect(() => {
    async function load() {
      setError(null)
      try {
        const response = await getAuthed(`/api/admin/users/${id}`)
        const payload = (await response.json()) as UserSummary
        setName(
          payload.user?.displayName ||
            payload.user?.name ||
            payload.user?.email ||
            'Coach sin nombre'
        )
      } catch (loadError) {
        reportInternalError('ADMIN_COACH_SCHEDULE', loadError)
        setName(null)
        setError(GENERIC_USER_ERROR)
      }
    }
    void load()
  }, [id])

  if (name === undefined) return <Loading />

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/admin/users/${id}`}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--c-ocean-mid)]"
      >
        <FiArrowLeft aria-hidden="true" />
        Volver al usuario
      </Link>

      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Horarios de {name || 'Coach'}</h1>
            <p className="mt-1 text-[var(--c-text-2)]">
              Consulta y edita las horas abiertas y bloqueos de este coach.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScheduleEditorOpen(true)}
            className="btn btn-primary min-h-11"
          >
            <FiEdit2 aria-hidden="true" /> Editar horarios
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 text-sm text-[var(--c-text-2)] shadow-[var(--shadow-sm)]">
          {error}
        </p>
      )}

      <CoachAgenda
        coachId={id}
        scheduleEditorOpen={scheduleEditorOpen}
        onScheduleEditorClose={() => setScheduleEditorOpen(false)}
      />
    </div>
  )
}
