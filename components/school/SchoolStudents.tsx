'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiClock, FiMail, FiPlus, FiTrash2, FiUsers } from 'react-icons/fi'
import type { AdditionalProfile } from '@/lib/additional-profile'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import {
  type SchoolGender,
  type SchoolInvitation,
  type SchoolStudent,
  schoolMembershipHasRole,
} from '@/lib/school'
import SchoolNoSelection from './SchoolNoSelection'
import SchoolSelector from './SchoolSelector'
import SchoolStudentHistory from './SchoolStudentHistory'
import { useSchoolSelection } from './useSchoolSelection'

export default function SchoolStudents() {
  const { schools, selected, selectedId, status: schoolStatus, selectSchool } = useSchoolSelection()
  const [students, setStudents] = useState<SchoolStudent[]>([])
  const [invitations, setInvitations] = useState<SchoolInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [showStudent, setShowStudent] = useState(false)
  const [historyStudent, setHistoryStudent] = useState<SchoolStudent | null>(null)
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId) return
    setHistoryStudent(null)
    setLoading(true)
    async function load() {
      const studentResponse = await getAuthed(`/api/schools/${selectedId}/students`)
      const studentPayload = (await studentResponse.json()) as { students?: SchoolStudent[] }
      let invitationPayload: { invitations?: SchoolInvitation[] } | null = null
      if (schoolMembershipHasRole(selected?.membership, 'director')) {
        const invitationResponse = await getAuthed(`/api/schools/${selectedId}/invitations`)
        invitationPayload = (await invitationResponse.json()) as {
          invitations?: SchoolInvitation[]
        }
      }
      return { studentPayload, invitationPayload }
    }
    load()
      .then(({ studentPayload, invitationPayload }) => {
        setStudents(studentPayload.students || [])
        setInvitations(invitationPayload?.invitations || [])
      })
      .catch(() => setMessage('No se pudieron cargar los alumnos.'))
      .finally(() => setLoading(false))
  }, [selectedId, selected?.membership])

  if (schoolStatus === 'loading')
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Cargando alumnos…</div>
  if (schoolStatus === 'error')
    return <p className="text-sm text-(--c-error,#b91c1c)">No pudimos cargar tus escuelas.</p>
  if (!selected) return <SchoolNoSelection />
  const activeSchool = selected
  const isDirector = schoolMembershipHasRole(selected.membership, 'director')
  const isStudentAccount = schoolMembershipHasRole(selected.membership, 'student')

  async function deleteInvitation(invitation: SchoolInvitation) {
    const action = invitation.status === 'pending' ? 'cancelar' : 'eliminar'
    if (!window.confirm(`¿Quieres ${action} la invitación de ${invitation.email}?`)) return
    setDeletingInvitationId(invitation.id)
    setMessage(null)
    try {
      await deleteAuthed(`/api/schools/${activeSchool.school.id}/invitations/${invitation.id}`)
      setInvitations((current) => current.filter((item) => item.id !== invitation.id))
    } catch {
      setMessage('No se pudo eliminar la invitación.')
    } finally {
      setDeletingInvitationId(null)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <h1 className="sr-only">Alumnos</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-col gap-2 sm:items-end">
          <SchoolSelector
            schools={schools}
            selectedId={selected.school.id}
            onChange={selectSchool}
          />
          <div className="flex flex-wrap gap-2">
            {(isDirector || isStudentAccount) && (
              <button
                type="button"
                onClick={() => setShowStudent(true)}
                className="btn btn-primary min-h-11 gap-2"
              >
                <FiPlus aria-hidden="true" /> {isDirector ? 'Agregar alumno' : 'Agregar Adicional'}
              </button>
            )}
          </div>
        </div>
      </div>
      {message && (
        <p className="rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
      {loading ? (
        <div className="py-12 text-center text-sm text-(--c-text-2)">Cargando…</div>
      ) : students.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {students.map((student) => (
            <article
              key={student.id}
              className="flex items-start gap-3 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean-mid)">
                <FiUsers aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-(--c-ocean)">{student.name}</h2>
                {student.additionalProfileId && (
                  <span className="badge badge-outline mt-1">Adicional</span>
                )}
                <p className="mt-1 text-sm text-(--c-text-2)">
                  {student.gender} · Nacimiento: {student.birthDate}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-(--c-text-2)">
                  <FiMail aria-hidden="true" />{' '}
                  {student.studentEmail || student.guardianEmail || 'Sin correo'}
                </p>
                <button
                  type="button"
                  onClick={() => setHistoryStudent(student)}
                  className="btn btn-outline mt-3 min-h-11 gap-2"
                >
                  <FiClock aria-hidden="true" /> Ver historial
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[var(--r-md)] border border-dashed border-(--c-ocean-mid) bg-white p-8 text-center">
          <FiUsers className="text-3xl text-(--c-ocean-mid)" aria-hidden="true" />
          <h2 className="font-bold text-(--c-ocean)">
            {isDirector ? 'Invita o agrega al primer alumno' : 'Tus alumnos adicionales'}
          </h2>
          <p className="max-w-md text-sm text-(--c-text-2)">
            {isDirector
              ? 'Invita por correo o registra los datos del alumno.'
              : 'Gestiona personas adultas o menores mediante perfiles Adicionales.'}
          </p>
        </div>
      )}
      {isDirector && invitations.length > 0 && (
        <div className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5">
          <h2 className="font-bold text-(--c-ocean)">Invitaciones recientes</h2>
          <div className="mt-3 grid gap-2">
            {invitations.slice(0, 8).map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-sm)] bg-(--c-surface) px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {invite.email} · {invite.role === 'student' ? 'Alumno' : 'Coach'}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-(--c-text-2)">
                    {invite.status === 'pending'
                      ? 'Pendiente'
                      : invite.status === 'accepted'
                        ? 'Aceptada'
                        : invite.status === 'revoked'
                          ? 'Cancelada'
                          : 'Expirada'}
                  </span>
                  {invite.status !== 'accepted' && (
                    <button
                      type="button"
                      disabled={deletingInvitationId === invite.id}
                      onClick={() => void deleteInvitation(invite)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-(--c-error,#b91c1c) hover:underline disabled:opacity-50"
                    >
                      <FiTrash2 aria-hidden="true" />
                      {deletingInvitationId === invite.id
                        ? 'Eliminando…'
                        : invite.status === 'pending'
                          ? 'Cancelar'
                          : 'Eliminar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {historyStudent && (
        <SchoolStudentHistory
          key={`${selected.school.id}-${historyStudent.id}`}
          schoolId={selected.school.id}
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
        />
      )}
      {showStudent && (
        <StudentForm
          schoolId={selected.school.id}
          canInvite={isDirector}
          onClose={() => setShowStudent(false)}
          onCreated={(student, invitation) => {
            if (student) {
              setStudents((current) =>
                [...current, student].sort((a, b) => a.name.localeCompare(b.name))
              )
            }
            if (invitation) setInvitations((current) => [invitation, ...current])
            setShowStudent(false)
          }}
        />
      )}
    </section>
  )
}

function StudentForm({
  schoolId,
  canInvite,
  onClose,
  onCreated,
}: {
  schoolId: string
  canInvite: boolean
  onClose: () => void
  onCreated: (student: SchoolStudent | null, invitation?: SchoolInvitation | null) => void
}) {
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    gender: 'varonil' as SchoolGender,
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
    studentEmail: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<AdditionalProfile[]>([])
  const [additionalProfileId, setAdditionalProfileId] = useState('')
  useEffect(() => {
    if (canInvite) return
    getAuthed('/api/additional-profiles')
      .then((r) => r.json())
      .then((p) => setProfiles(p.profiles || []))
      .catch(() => setError('No se pudieron cargar tus Adicionales.'))
  }, [canInvite])

  const validEmail = /^\S+@\S+\.\S+$/.test(form.studentEmail.trim())

  async function save(sendInvitation: boolean) {
    if (sendInvitation && !/^\S+@\S+\.\S+$/.test(form.studentEmail.trim())) {
      setError('Escribe un correo válido para enviar la invitación.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await postAuthed(`/api/schools/${schoolId}/students`, {
        ...form,
        additionalProfileId,
        sendInvitation,
      })
      const payload = (await response.json()) as {
        student: SchoolStudent
        invitation?: SchoolInvitation | null
      }
      onCreated(payload.student, payload.invitation)
    } catch {
      setError('No se pudo guardar el alumno.')
    } finally {
      setSaving(false)
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    await save(false)
  }

  async function sendInvitationOnly() {
    if (!validEmail) {
      setError('Escribe un correo válido para enviar la invitación.')
      return
    }
    const hasStudentData = form.name.trim().length >= 2 && form.birthDate && form.gender
    if (hasStudentData) {
      await save(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await postAuthed(`/api/schools/${schoolId}/invitations`, {
        email: form.studentEmail,
        role: 'student',
      })
      const payload = (await response.json()) as { invitation: SchoolInvitation }
      onCreated(null, payload.invitation)
    } catch {
      setError('No se pudo enviar la invitación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={canInvite ? 'Agregar alumno' : 'Agregar Adicional'} onClose={onClose}>
      <form onSubmit={submit} className="grid max-h-[70vh] gap-3 overflow-y-auto">
        {!canInvite && (
          <>
            <label className="grid gap-1 text-sm font-semibold">
              Adicional
              <select
                required
                className="min-h-11 w-full rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)"
                value={additionalProfileId}
                onChange={(event) => {
                  const profile = profiles.find((p) => p.id === event.target.value)
                  setAdditionalProfileId(event.target.value)
                  if (profile)
                    setForm((current) => ({
                      ...current,
                      name: profile.name,
                      birthDate: profile.birthDate,
                      gender: profile.gender,
                    }))
                }}
              >
                <option value="">Selecciona un Adicional</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/profile" className="font-semibold underline">
              Crear Adicional en Mi perfil
            </Link>
          </>
        )}
        {canInvite && (
          <>
            <Text
              label="Correo del alumno (opcional)"
              value={form.studentEmail}
              onChange={(value) => setForm({ ...form, studentEmail: value })}
              type="email"
            />
            {canInvite && (
              <button
                type="button"
                disabled={saving || !validEmail}
                onClick={() => void sendInvitationOnly()}
                className="btn btn-outline min-h-11"
              >
                {saving ? 'Enviando…' : 'Enviar invitación'}
              </button>
            )}
            <p className="-mt-1 text-xs text-(--c-text-2)">
              Invita solo con el correo para que el alumno complete sus datos, o llena el formulario
              y guarda su registro.
            </p>
            <Text
              label="Nombre completo"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              required
            />
            <Text
              label="Fecha de nacimiento"
              type="date"
              value={form.birthDate}
              onChange={(value) => setForm({ ...form, birthDate: value })}
              required
            />
            <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
              Rama / género
              <select
                value={form.gender}
                onChange={(event) =>
                  setForm({ ...form, gender: event.target.value as SchoolGender })
                }
                className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
              >
                <option value="varonil">Varonil</option>
                <option value="femenil">Femenil</option>
                <option value="otro">Otro</option>
              </select>
            </label>
          </>
        )}
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <button
          type="submit"
          disabled={saving || (!canInvite && !additionalProfileId)}
          className="btn btn-primary min-h-11"
        >
          {saving ? 'Guardando…' : 'Guardar alumno'}
        </button>
      </form>
    </Modal>
  )
}

function Text({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
      />
    </label>
  )
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,37,64,0.55)] p-4"
    >
      <div className="w-full max-w-lg rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)] sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-(--c-ocean)">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-(--c-text-2)"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
