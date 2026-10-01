'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiClock, FiEdit2, FiPhone, FiSend, FiShield } from 'react-icons/fi'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import { type SchoolInvitation, schoolMembershipHasRole } from '@/lib/school'
import SchoolNoSelection from './SchoolNoSelection'
import SchoolSelector from './SchoolSelector'
import { useSchoolSelection } from './useSchoolSelection'

interface Teacher {
  id: string
  name: string
  phone: string
  bio: string
  profileComplete: boolean
  availability: Array<{ day: number; start: string; end: string }>
}

export default function SchoolCoaches() {
  const { schools, selected, selectedId, status: schoolStatus, selectSchool } = useSchoolSelection()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [invitations, setInvitations] = useState<SchoolInvitation[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    async function load() {
      const teacherResponse = await getAuthed(`/api/schools/${selectedId}/teachers`)
      const teacherPayload = (await teacherResponse.json()) as { teachers?: Teacher[] }
      let invitePayload: { invitations?: SchoolInvitation[] } | null = null
      if (schoolMembershipHasRole(selected?.membership, 'director')) {
        const invitationResponse = await getAuthed(`/api/schools/${selectedId}/invitations`)
        invitePayload = (await invitationResponse.json()) as { invitations?: SchoolInvitation[] }
      }
      return { teacherPayload, invitePayload }
    }
    load()
      .then(({ teacherPayload, invitePayload }) => {
        setTeachers(teacherPayload.teachers || [])
        setInvitations(invitePayload?.invitations?.filter((item) => item.role === 'teacher') || [])
      })
      .catch(() => setMessage('No se pudieron cargar los coaches.'))
      .finally(() => setLoading(false))
  }, [selectedId, selected?.membership])

  if (schoolStatus === 'loading')
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Cargando coaches…</div>
  if (schoolStatus === 'error')
    return <p className="text-sm text-(--c-error,#b91c1c)">No pudimos cargar tus escuelas.</p>
  if (!selected) return <SchoolNoSelection />
  const isDirector = schoolMembershipHasRole(selected.membership, 'director')

  return (
    <section className="flex flex-col gap-5">
      <h1 className="sr-only">Profes</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-col gap-2 sm:items-end">
          <SchoolSelector
            schools={schools}
            selectedId={selected.school.id}
            onChange={selectSchool}
          />
          {isDirector && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="btn btn-primary min-h-11 gap-2"
            >
              <FiSend aria-hidden="true" /> Invitar coach
            </button>
          )}
        </div>
      </div>
      {message && (
        <p className="rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
      {loading ? (
        <div className="py-12 text-center text-sm text-(--c-text-2)">Cargando…</div>
      ) : teachers.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {teachers.map((teacher) =>
            (() => {
              const isOwnTeacher = teacher.id === selected.membership.userId
              return (
                <article
                  key={teacher.id}
                  className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff7e8] text-[#9a6b16]">
                      <FiShield aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-bold text-(--c-ocean)">{teacher.name}</h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-(--c-text-2)">
                        <FiPhone aria-hidden="true" /> {teacher.phone || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-(--c-text-2)">
                    <FiClock aria-hidden="true" />{' '}
                    {teacher.availability.length
                      ? `${teacher.availability.length} horarios disponibles`
                      : 'Disponibilidad pendiente'}
                  </div>
                  {!teacher.profileComplete && (
                    <p className="mt-3 text-xs font-semibold text-[#9a6b16]">
                      Perfil pendiente de completar
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/school/classes"
                      onClick={() => {
                        window.localStorage.setItem('nadamas.schoolId', selected.school.id)
                      }}
                      className="btn btn-outline min-h-11 gap-2 text-(--c-ocean)"
                    >
                      <FiClock aria-hidden="true" /> Ver horarios
                    </Link>
                    {isOwnTeacher && (
                      <Link
                        href="/profile"
                        className="btn btn-ghost min-h-10 gap-2 text-(--c-ocean-mid)"
                      >
                        <FiEdit2 aria-hidden="true" /> Actualizar datos
                      </Link>
                    )}
                  </div>
                </article>
              )
            })()
          )}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[var(--r-md)] border border-dashed border-(--c-ocean-mid) bg-white p-8 text-center">
          <FiShield className="text-3xl text-(--c-ocean-mid)" aria-hidden="true" />
          <h2 className="font-bold text-(--c-ocean)">
            {isDirector ? 'Invita al primer coach' : 'Aún no hay coaches'}
          </h2>
          <p className="max-w-md text-sm text-(--c-text-2)">
            Los coaches invitados podrán completar su perfil y horarios disponibles.
          </p>
        </div>
      )}
      {isDirector && invitations.length > 0 && (
        <div className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5">
          <h2 className="font-bold text-(--c-ocean)">Invitaciones de coaches</h2>
          <div className="mt-3 grid gap-2">
            {invitations.slice(0, 8).map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-sm)] bg-(--c-surface) px-3 py-2 text-sm"
              >
                <span>{invite.email}</span>
                <span className="font-semibold text-(--c-text-2)">
                  {invite.status === 'pending'
                    ? 'Pendiente'
                    : invite.status === 'accepted'
                      ? 'Aceptada'
                      : 'Expirada'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showInvite && (
        <InviteCoach
          schoolId={selected.school.id}
          onClose={() => setShowInvite(false)}
          onCreated={(invite) => {
            setInvitations((current) => [invite, ...current])
            setShowInvite(false)
          }}
        />
      )}
    </section>
  )
}

function InviteCoach({
  schoolId,
  onClose,
  onCreated,
}: {
  schoolId: string
  onClose: () => void
  onCreated: (invite: SchoolInvitation) => void
}) {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await postAuthed(`/api/schools/${schoolId}/invitations`, {
        email,
        role: 'teacher',
      })
      const payload = (await response.json()) as { invitation: SchoolInvitation }
      onCreated(payload.invitation)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo enviar la invitación.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(10,37,64,0.55)] p-4"
    >
      <form
        onSubmit={submit}
        className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto max-w-md rounded-[var(--r-md)] bg-white p-6 shadow-[var(--shadow-md)]"
      >
        <h2 className="text-xl font-extrabold text-(--c-ocean)">Invitar coach</h2>
        <p className="mt-1 text-sm text-(--c-text-2)">
          Se enviará un enlace para crear o completar su cuenta.
        </p>
        <label className="mt-5 grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Correo electrónico
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
          />
        </label>
        {error && <p className="mt-3 text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-outline min-h-11 flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary min-h-11 flex-1">
            {saving ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  )
}
