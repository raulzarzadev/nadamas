'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiClipboard, FiPlus, FiTrash2, FiUsers } from 'react-icons/fi'
import StudentLabels from '@/components/coach/StudentLabels'
import StudentLabelTools, { type LabelList } from '@/components/coach/StudentLabelTools'
import StudentProfileModal from '@/components/coach/StudentProfileModal'
import PersonFields from '@/components/profile/PersonFields'
import ExistingEntityMatches from '@/components/ui/existing-entity-matches'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import Sheet from '@/components/ui/sheet'
import StudentListRow from '@/components/ui/student-list-row'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import type { AdditionalProfile } from '@/lib/additional-profile'
import { deleteAuthed, getAuthed, getCachedAuthedData, postAuthed } from '@/lib/client/authed-api'
import { entityNameMatches, normalizeEntitySearch } from '@/lib/entity-matching'
import {
  capitalizeSchoolTerm,
  type SchoolGender,
  type SchoolInvitation,
  type SchoolStudent,
  schoolMembershipHasRole,
} from '@/lib/school'
import SchoolAccessRequests from './SchoolAccessRequests'
import SchoolNoSelection from './SchoolNoSelection'
import SchoolSelector from './SchoolSelector'
import SchoolStudentHistory from './SchoolStudentHistory'
import { useSchoolSelection } from './useSchoolSelection'

export default function SchoolStudents() {
  const { schools, selected, selectedId, status: schoolStatus, selectSchool } = useSchoolSelection()
  const terminology = useSchoolTerminology()
  const [labelData, setLabelData] = useState<LabelList>({ labels: [], assignments: {} })
  const [labelFilter, setLabelFilter] = useState<string[] | null>(null)
  const [labelRevision, setLabelRevision] = useState(0)
  const [students, setStudents] = useState<SchoolStudent[]>([])
  const [invitations, setInvitations] = useState<SchoolInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [showStudent, setShowStudent] = useState(false)
  const [historyStudent, setHistoryStudent] = useState<SchoolStudent | null>(null)
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId) return
    let active = true
    const studentsPath = `/api/schools/${selectedId}/students?includeAgendaStudents=true`
    const invitationsPath = `/api/schools/${selectedId}/invitations`
    const cachedStudents = getCachedAuthedData<{ students?: SchoolStudent[] }>(studentsPath)
    const isDirector = schoolMembershipHasRole(selected?.membership, 'director')
    const cachedInvitations = isDirector
      ? getCachedAuthedData<{ invitations?: SchoolInvitation[] }>(invitationsPath)
      : undefined
    setHistoryStudent(null)
    setLabelData({ labels: [], assignments: {} })
    setLabelFilter(null)
    setMessage(null)
    setStudents(cachedStudents?.students || [])
    setInvitations(cachedInvitations?.invitations || [])
    setLoading(!cachedStudents)

    getAuthed(studentsPath)
      .then((response) => response.json() as Promise<{ students?: SchoolStudent[] }>)
      .then((payload) => {
        if (active) setStudents(payload.students || [])
      })
      .catch(() => {
        if (active)
          setMessage(
            `No se pudieron cargar ${terminology.schoolId ? terminology.participantPlural : 'los alumnos'}.`
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    if (isDirector) {
      getAuthed(invitationsPath)
        .then((response) => response.json() as Promise<{ invitations?: SchoolInvitation[] }>)
        .then((payload) => {
          if (active) setInvitations(payload.invitations || [])
        })
        .catch(() => {
          if (active) setMessage('No se pudieron cargar las invitaciones.')
        })
    }
    return () => {
      active = false
    }
  }, [selectedId, selected?.membership, terminology.participantPlural, terminology.schoolId])

  if (schoolStatus === 'loading') return <ProfileLoadingSkeleton />
  if (schoolStatus === 'error')
    return <p className="text-sm text-(--c-error,#b91c1c)">No pudimos cargar tus escuelas.</p>
  if (!selected) return <SchoolNoSelection />
  const activeSchool = selected
  const isDirector = schoolMembershipHasRole(selected.membership, 'director')
  const canAssignClasses = isDirector || schoolMembershipHasRole(selected.membership, 'teacher')
  const isStudentAccount = schoolMembershipHasRole(selected.membership, 'student')
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
  const participantPlural = terminology.schoolId ? terminology.participantPlural : 'alumnos'
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'

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
      <h1 className="sr-only">{capitalizeSchoolTerm(participantPlural)}</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-col gap-2 sm:items-end">
          <SchoolSelector
            schools={schools}
            selectedId={selected.school.id}
            onChange={selectSchool}
          />
          <div className="flex flex-wrap gap-2">
            {(canAssignClasses || isStudentAccount) && (
              <button
                type="button"
                onClick={() => setShowStudent(true)}
                className="btn btn-primary min-h-11 gap-2"
              >
                <FiPlus aria-hidden="true" />{' '}
                {canAssignClasses ? `Agregar ${participantSingular}` : 'Agregar Adicional'}
              </button>
            )}
          </div>
        </div>
      </div>
      {isDirector && (
        <SchoolAccessRequests
          key={`access-requests:${selected.school.id}`}
          schoolId={selected.school.id}
          onApproved={async () => {
            const response = await getAuthed(
              `/api/schools/${activeSchool.school.id}/students?includeAgendaStudents=true`
            )
            const payload = await response.json()
            setStudents(payload.students || [])
          }}
        />
      )}
      {message && (
        <p className="rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
      {canAssignClasses && (
        <StudentLabelTools
          key={`student-labels:${activeSchool.school.id}`}
          schoolId={activeSchool.school.id}
          students={students.map((student) => ({ id: student.id, name: student.name }))}
          revision={labelRevision}
          onFilter={setLabelFilter}
          onData={setLabelData}
          onUpdated={() => setLabelRevision((current) => current + 1)}
        />
      )}
      {loading ? (
        <div className="py-12 text-center text-sm text-(--c-text-2)">Cargando…</div>
      ) : students.length ? (
        <div className="overflow-hidden rounded-[var(--r-md)] border border-(--c-border) bg-white shadow-[var(--shadow-sm)]">
          {students
            .filter((student) => !labelFilter || labelFilter.includes(student.id))
            .map((student) => (
              <StudentListRow
                key={student.id}
                student={{ ...student, email: student.studentEmail || student.guardianEmail }}
                labels={
                  canAssignClasses && labelData.assignments[student.id]?.length ? (
                    <StudentLabels
                      studentId={student.id}
                      schoolId={activeSchool.school.id}
                      readOnly
                      compact
                      tiny
                      horizontal
                      data={{
                        labels: labelData.labels,
                        selected: labelData.assignments[student.id] || [],
                      }}
                    />
                  ) : undefined
                }
                action={
                  <button
                    type="button"
                    onClick={() => setHistoryStudent(student)}
                    aria-label={
                      isDirector
                        ? `Abrir perfil de ${student.name}`
                        : `Abrir historial y clases de ${student.name}`
                    }
                    title={
                      isDirector
                        ? `Perfil de ${student.name}`
                        : `Historial y clases de ${student.name}`
                    }
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-(--c-ocean) text-lg text-(--c-ocean) transition hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
                  >
                    <FiClipboard aria-hidden="true" />
                  </button>
                }
              />
            ))}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[var(--r-md)] border border-dashed border-(--c-ocean-mid) bg-white p-8 text-center">
          <FiUsers className="text-3xl text-(--c-ocean-mid)" aria-hidden="true" />
          <h2 className="font-bold text-(--c-ocean)">
            {isDirector
              ? `Invita o agrega a ${participantPlural}`
              : `Tus ${participantPlural} adicionales`}
          </h2>
          <p className="max-w-md text-sm text-(--c-text-2)">
            {isDirector
              ? `Invita por correo o registra los datos de ${participantPlural}.`
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
                  {invite.email} ·{' '}
                  {invite.role === 'student'
                    ? capitalizeSchoolTerm(participantSingular)
                    : capitalizeSchoolTerm(coachSingular)}
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
      {historyStudent && isDirector && (
        <StudentProfileModal
          key={`${selected.school.id}-${historyStudent.id}`}
          studentId={historyStudent.id}
          schoolId={selected.school.id}
          name={historyStudent.name}
          initialProfile={historyStudent}
          onUpdated={() => {
            void getAuthed(
              `/api/schools/${activeSchool.school.id}/students?includeAgendaStudents=true`
            )
              .then((response) => response.json())
              .then((payload) => setStudents(payload.students || []))
              .catch(() => setMessage('No se pudo actualizar la lista de alumnos.'))
          }}
          onClose={() => {
            setHistoryStudent(null)
            setLabelRevision((current) => current + 1)
          }}
        />
      )}
      {historyStudent && !isDirector && (
        <SchoolStudentHistory
          key={`${selected.school.id}-${historyStudent.id}`}
          schoolId={selected.school.id}
          timezone={selected.school.timezone || 'America/Mexico_City'}
          student={historyStudent}
          canAssign={canAssignClasses}
          isDirector={isDirector}
          viewerId={selected.membership.userId}
          onClose={() => {
            setHistoryStudent(null)
            setLabelRevision((current) => current + 1)
          }}
        />
      )}
      {showStudent && (
        <StudentForm
          schoolId={selected.school.id}
          canInvite={canAssignClasses}
          onClose={() => setShowStudent(false)}
          onCreated={(student, invitation) => {
            if (student) {
              setStudents((current) =>
                [...current.filter((item) => item.id !== student.id), student].sort((a, b) =>
                  a.name.localeCompare(b.name)
                )
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

export function StudentForm({
  schoolId,
  initialName = '',
  onPersonalCreated,
  canInvite,
  onClose,
  onCreated,
}: {
  schoolId?: string
  initialName?: string
  onPersonalCreated?: (student: {
    athleteId: string
    name: string
    email: string | null
    phone?: string
  }) => void
  canInvite: boolean
  onClose: () => void
  onCreated: (student: SchoolStudent | null, invitation?: SchoolInvitation | null) => void
}) {
  const terminology = useSchoolTerminology()
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
  const [form, setForm] = useState({
    name: initialName,
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

  const [existingStudents, setExistingStudents] = useState<
    Array<{
      id?: string
      athleteId?: string
      name: string
      email?: string | null
      phone?: string
      studentEmail?: string
      guardianPhone?: string
    }>
  >([])
  const [matchesLoading, setMatchesLoading] = useState(canInvite)
  const [matchesFailed, setMatchesFailed] = useState(false)
  useEffect(() => {
    if (!canInvite) return
    let active = true
    setMatchesLoading(true)
    setMatchesFailed(false)
    getAuthed(schoolId ? `/api/schools/${schoolId}/students` : '/api/coach/students')
      .then((response) => response.json())
      .then((payload) => {
        if (active) setExistingStudents(payload.students || [])
      })
      .catch(() => {
        if (active) setMatchesFailed(true)
      })
      .finally(() => {
        if (active) setMatchesLoading(false)
      })
    return () => {
      active = false
    }
  }, [schoolId, canInvite])
  const matchingStudents = existingStudents.filter((student) =>
    entityNameMatches(student.name, form.name)
  )
  const exactMatch = matchingStudents.some(
    (student) => normalizeEntitySearch(student.name) === normalizeEntitySearch(form.name)
  )
  const cannotCreate = canInvite && (matchesLoading || matchesFailed || exactMatch)

  const validEmail = /^\S+@\S+\.\S+$/.test(form.studentEmail.trim())

  async function save(sendInvitation: boolean) {
    if (sendInvitation && !/^\S+@\S+\.\S+$/.test(form.studentEmail.trim())) {
      setError('Escribe un correo válido para enviar la invitación.')
      return
    }
    if (cannotCreate) return
    setSaving(true)
    setError(null)
    try {
      if (!schoolId) {
        const response = await postAuthed('/api/coach/students', {
          name: form.name,
          email: form.studentEmail,
          phone: form.guardianPhone,
          birthDate: form.birthDate,
          gender: form.gender,
        })
        const payload = await response.json()
        onPersonalCreated?.(payload.student)
        return
      }
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
      setError('No se pudo guardar el registro.')
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
    if (!schoolId) {
      if (form.name.trim().length < 2) {
        setError('Escribe el nombre del atleta para enviar la invitación.')
        return
      }
      await save(true)
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
    <Sheet
      open
      onClose={onClose}
      label={canInvite ? `Agregar ${participantSingular}` : 'Agregar Adicional'}
      keyboardAware
      fullBleedMobile
    >
      <form onSubmit={submit} className="grid gap-4 px-4 pb-3 sm:px-0 sm:pb-0">
        <h2 className="text-xl font-bold text-(--c-ocean)">
          {canInvite ? `Agregar ${participantSingular}` : 'Agregar Adicional'}
        </h2>
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
              label="Correo de contacto (opcional)"
              value={form.studentEmail}
              onChange={(value) => setForm({ ...form, studentEmail: value })}
              type="email"
            />
            {canInvite && (
              <button
                type="button"
                disabled={saving || !validEmail || cannotCreate}
                onClick={() => void sendInvitationOnly()}
                className="btn btn-outline min-h-11"
              >
                {saving ? 'Enviando…' : 'Enviar invitación'}
              </button>
            )}
            <p className="-mt-1 text-xs text-(--c-text-2)">
              Invita solo con el correo para que la persona complete sus datos, o llena el
              formulario y guarda su registro.
            </p>
            <PersonFields
              value={{
                name: form.name,
                phone: form.guardianPhone,
                birthDate: form.birthDate,
                gender: form.gender,
              }}
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  name: next.name,
                  guardianPhone: next.phone,
                  birthDate: next.birthDate,
                  gender: next.gender,
                }))
              }
              required={['name', 'birthDate']}
              disabled={saving}
            />
          </>
        )}
        {canInvite && (
          <ExistingEntityMatches
            items={matchingStudents}
            getKey={(student) => student.id || student.athleteId || ''}
            title="Atletas que ya existen"
            loading={matchesLoading}
            loadingMessage="Buscando atletas existentes…"
            error={
              matchesFailed
                ? 'No pudimos comprobar los atletas existentes. Cierra el formulario e inténtalo de nuevo.'
                : undefined
            }
            exactMatchMessage={
              exactMatch ? 'Ya existe un atleta con este nombre. Usa su registro.' : undefined
            }
            disabled={saving}
            renderItem={(student, action) => (
              <StudentListRow
                student={{ ...student, email: student.studentEmail || student.email }}
                action={action}
              />
            )}
            onSelect={(student) => {
              if (schoolId) onCreated(student as SchoolStudent)
              else if (student.athleteId)
                onPersonalCreated?.({
                  athleteId: student.athleteId,
                  name: student.name,
                  email: student.email || null,
                  phone: student.phone,
                })
            }}
          />
        )}
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <button
          type="submit"
          disabled={saving || cannotCreate || (!canInvite && !additionalProfileId)}
          className="btn btn-primary min-h-11"
        >
          {saving ? 'Guardando…' : `Guardar ${participantSingular}`}
        </button>
      </form>
    </Sheet>
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
