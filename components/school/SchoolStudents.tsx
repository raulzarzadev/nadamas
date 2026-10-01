'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiArrowLeft, FiMail, FiPlus, FiSend, FiTrash2, FiUsers } from 'react-icons/fi'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import {
  type SchoolGender,
  type SchoolInvitation,
  type SchoolStudent,
  schoolMembershipHasRole,
} from '@/lib/school'
import SchoolSelector from './SchoolSelector'
import { useSchoolSelection } from './useSchoolSelection'

export default function SchoolStudents() {
  const { schools, selected, selectedId, status: schoolStatus, selectSchool } = useSchoolSelection()
  const [students, setStudents] = useState<SchoolStudent[]>([])
  const [invitations, setInvitations] = useState<SchoolInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showStudent, setShowStudent] = useState(false)
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId) return
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

  if (schoolStatus === 'loading' || !selected)
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Cargando alumnos…</div>
  if (schoolStatus === 'error')
    return <p className="text-sm text-(--c-error,#b91c1c)">No pudimos cargar tus escuelas.</p>
  const activeSchool = selected
  const isDirector = schoolMembershipHasRole(selected.membership, 'director')
  const isGuardian = schoolMembershipHasRole(selected.membership, 'guardian')

  async function deleteInvitation(invitation: SchoolInvitation) {
    const action = invitation.status === 'pending' ? 'cancelar' : 'eliminar'
    if (!window.confirm(`¿Quieres ${action} la invitación de ${invitation.email}?`)) return
    setDeletingInvitationId(invitation.id)
    setMessage(null)
    try {
      await deleteAuthed(`/api/schools/${activeSchool.school.id}/invitations/${invitation.id}`)
      setInvitations((current) => current.filter((item) => item.id !== invitation.id))
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'No se pudo eliminar la invitación.')
    } finally {
      setDeletingInvitationId(null)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/school"
            className="inline-flex items-center gap-2 text-sm font-semibold text-(--c-ocean-mid)"
          >
            <FiArrowLeft aria-hidden="true" /> Panel de escuela
          </Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-(--c-aqua-strong)">
            Comunidad escolar
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-(--c-ocean)">Alumnos</h1>
          <p className="mt-1 text-(--c-text-2)">{selected.school.name}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <SchoolSelector
            schools={schools}
            selectedId={selected.school.id}
            onChange={selectSchool}
          />
          <div className="flex flex-wrap gap-2">
            {(isDirector || isGuardian) && (
              <button
                type="button"
                onClick={() => setShowStudent(true)}
                className="btn btn-outline min-h-11 gap-2"
              >
                <FiPlus aria-hidden="true" /> Agregar alumno
              </button>
            )}
            {isDirector && (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="btn btn-primary min-h-11 gap-2"
              >
                <FiSend aria-hidden="true" /> Invitar tutor
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
              <div className="min-w-0">
                <h2 className="font-bold text-(--c-ocean)">{student.name}</h2>
                <p className="mt-1 text-sm text-(--c-text-2)">
                  {student.gender} · Nacimiento: {student.birthDate}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-(--c-text-2)">
                  <FiMail aria-hidden="true" />{' '}
                  {student.studentEmail || student.guardianEmail || 'Sin correo'}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[var(--r-md)] border border-dashed border-(--c-ocean-mid) bg-white p-8 text-center">
          <FiUsers className="text-3xl text-(--c-ocean-mid)" aria-hidden="true" />
          <h2 className="font-bold text-(--c-ocean)">
            {isDirector ? 'Invita al primer tutor' : 'Agrega al primer alumno'}
          </h2>
          <p className="max-w-md text-sm text-(--c-text-2)">
            {isDirector
              ? 'El tutor aceptará la invitación y registrará los datos del menor.'
              : 'Registra a los menores que estarán bajo tu cuenta.'}
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
                  {invite.email} · {invite.role === 'student' ? 'Alumno' : 'Tutor'}
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
      {showInvite && (
        <InviteTutor
          schoolId={selected.school.id}
          onClose={() => setShowInvite(false)}
          onCreated={(invite) => {
            setInvitations((current) => [invite, ...current])
            setShowInvite(false)
          }}
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

function InviteTutor({
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
        role: 'guardian',
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
    <Modal title="Invitar tutor" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-sm text-(--c-text-2)">
          El tutor creará su cuenta y registrará los datos de uno o varios menores.
        </p>
        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Correo electrónico
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
          />
        </label>
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary min-h-11">
          {saving ? 'Enviando…' : 'Enviar invitación'}
        </button>
      </form>
    </Modal>
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
  const [guardianExpanded, setGuardianExpanded] = useState(false)
  const minor = isMinorBirthDate(form.birthDate)
  const guardianVisible = minor || guardianExpanded

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
        sendInvitation,
      })
      const payload = (await response.json()) as {
        student: SchoolStudent
        invitation?: SchoolInvitation | null
      }
      onCreated(payload.student, payload.invitation)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el alumno.')
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
    if (minor) {
      setError('Los menores de 18 años deben registrarse con un padre o tutor.')
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo enviar la invitación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Agregar alumno" onClose={onClose}>
      <form onSubmit={submit} className="grid max-h-[70vh] gap-3 overflow-y-auto">
        <Text
          label="Correo del alumno (opcional)"
          value={form.studentEmail}
          onChange={(value) => setForm({ ...form, studentEmail: value })}
          type="email"
        />
        {canInvite && form.studentEmail.trim() && (
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
          Puedes enviar la invitación ahora y el alumno completará sus propios datos.
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
            onChange={(event) => setForm({ ...form, gender: event.target.value as SchoolGender })}
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
          >
            <option value="varonil">Varonil</option>
            <option value="femenil">Femenil</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <div className="rounded-[var(--r-sm)] border border-(--c-border) bg-(--c-surface) p-4">
          <label className="flex items-start gap-3 text-sm font-semibold text-(--c-ocean)">
            <input
              type="checkbox"
              checked={guardianVisible}
              disabled={minor}
              onChange={(event) => setGuardianExpanded(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-(--c-ocean)"
            />
            <span>
              Agregar padre o tutor{' '}
              <span className="font-normal text-(--c-text-2)">
                ({minor ? 'obligatorio' : 'opcional'})
              </span>
            </span>
          </label>
          {guardianVisible && (
            <div className="mt-4 grid gap-3 border-t border-(--c-border) pt-4">
              <Text
                label="Nombre del tutor"
                value={form.guardianName}
                onChange={(value) => setForm({ ...form, guardianName: value })}
                required={minor}
              />
              <Text
                label="Parentesco"
                value={form.guardianRelationship}
                onChange={(value) => setForm({ ...form, guardianRelationship: value })}
                required={minor}
              />
              <Text
                label="Teléfono del tutor"
                value={form.guardianPhone}
                onChange={(value) => setForm({ ...form, guardianPhone: value })}
                type="tel"
                required={minor}
              />
            </div>
          )}
        </div>
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary min-h-11">
          {saving ? 'Guardando…' : 'Guardar alumno'}
        </button>
      </form>
    </Modal>
  )
}

function isMinorBirthDate(value: string) {
  const birthDate = new Date(`${value}T00:00:00Z`)
  if (!value || Number.isNaN(birthDate.getTime()) || birthDate.getTime() > Date.now()) return false
  const today = new Date()
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear()
  const beforeBirthday =
    today.getUTCMonth() < birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate())
  if (beforeBirthday) age -= 1
  return age < 18
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
