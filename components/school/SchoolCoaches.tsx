'use client'

import Sheet from '@comps/ui/sheet'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiClipboard, FiClock, FiEdit2, FiPhone, FiSend, FiShield } from 'react-icons/fi'
import CoachAgenda from '@/components/coach/CoachAgenda'
import StudentLabels from '@/components/coach/StudentLabels'
import StudentLabelTools, { type LabelList } from '@/components/coach/StudentLabelTools'
import CoachBadge from '@/components/ui/coach-badge'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import { capitalizeSchoolTerm, type SchoolInvitation, schoolMembershipHasRole } from '@/lib/school'
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
  canManageSchoolBookings: boolean
}

export default function SchoolCoaches() {
  const { schools, selected, selectedId, status: schoolStatus, selectSchool } = useSchoolSelection()
  const terminology = useSchoolTerminology()
  const [labelData, setLabelData] = useState<LabelList | null>(null)
  const [labelRevision, setLabelRevision] = useState(0)
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null)
  const [scheduleTeacher, setScheduleTeacher] = useState<Teacher | null>(null)
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [invitations, setInvitations] = useState<SchoolInvitation[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [savingPermission, setSavingPermission] = useState<string | null>(null)

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
      .catch(() =>
        setMessage(
          `No se pudieron cargar ${terminology.schoolId ? terminology.coachPlural : 'los coaches'}.`
        )
      )
      .finally(() => setLoading(false))
  }, [selectedId, selected?.membership, terminology.coachPlural, terminology.schoolId])

  if (schoolStatus === 'loading')
    return (
      <div className="py-16 text-center text-sm text-(--c-text-2)">
        Cargando {terminology.schoolId ? terminology.coachPlural : 'coaches'}…
      </div>
    )
  if (schoolStatus === 'error')
    return <p className="text-sm text-(--c-error,#b91c1c)">No pudimos cargar tus escuelas.</p>
  if (!selected) return <SchoolNoSelection />
  const isDirector = schoolMembershipHasRole(selected.membership, 'director')
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  const coachPlural = terminology.schoolId ? terminology.coachPlural : 'coaches'
  const CoachPlural = capitalizeSchoolTerm(coachPlural)
  const schoolId = selected.school.id

  async function setBookingPermission(teacher: Teacher, enabled: boolean) {
    setSavingPermission(teacher.id)
    setMessage(null)
    try {
      await patchAuthed(`/api/schools/${schoolId}/teachers`, {
        teacherId: teacher.id,
        canManageSchoolBookings: enabled,
      })
      setTeachers((current) =>
        current.map((item) =>
          item.id === teacher.id ? { ...item, canManageSchoolBookings: enabled } : item
        )
      )
    } catch {
      setMessage('No se pudo actualizar el permiso de reservas.')
    } finally {
      setSavingPermission(null)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <h1 className="sr-only">{CoachPlural}</h1>
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
              <FiSend aria-hidden="true" /> Invitar {coachSingular}
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
        <div className="grid gap-2">
          {isDirector && (
            <StudentLabelTools
              key={schoolId}
              schoolId={schoolId}
              entity="teachers"
              students={teachers}
              revision={labelRevision}
              onFilter={setFilteredIds}
              onData={setLabelData}
              onUpdated={() => setLabelRevision((current) => current + 1)}
            />
          )}
          {teachers
            .filter(
              (teacher) => !isDirector || filteredIds === null || filteredIds.includes(teacher.id)
            )
            .map((teacher) => (
              <article
                key={teacher.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-(--c-border) bg-white px-3 py-2"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <CoachBadge name={teacher.name} />
                  {isDirector && (
                    <StudentLabels
                      key={`${teacher.id}:${labelRevision}`}
                      studentId={teacher.id}
                      schoolId={schoolId}
                      entity="teachers"
                      data={{
                        labels: labelData?.labels || [],
                        selected: labelData?.assignments[teacher.id] || [],
                      }}
                      readOnly
                    />
                  )}
                </div>
                <span className="text-xs text-(--c-text-2)">
                  {teacher.availability.length} horarios
                </span>
                <button
                  type="button"
                  onClick={() => setScheduleTeacher(teacher)}
                  aria-label={`Ver horarios de ${teacher.name}`}
                  title="Ver horarios"
                  className="grid size-8 place-items-center rounded-full border border-(--c-border) text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                >
                  <FiClock aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherProfile(teacher)}
                  aria-label={`Abrir ficha de ${teacher.name}`}
                  title="Abrir ficha"
                  className="grid size-8 place-items-center rounded-full border border-(--c-border) text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                >
                  <FiClipboard aria-hidden="true" />
                </button>
              </article>
            ))}
          {isDirector &&
            filteredIds !== null &&
            !teachers.some((teacher) => filteredIds.includes(teacher.id)) && (
              <p className="py-4 text-sm text-(--c-text-2)">
                No hay {coachPlural} con esta etiqueta.
              </p>
            )}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[var(--r-md)] border border-dashed border-(--c-ocean-mid) bg-white p-8 text-center">
          <FiShield className="text-3xl text-(--c-ocean-mid)" aria-hidden="true" />
          <h2 className="font-bold text-(--c-ocean)">
            {isDirector ? `Invita a tus ${coachPlural}` : `Aún no hay ${coachPlural}`}
          </h2>
          <p className="max-w-md text-sm text-(--c-text-2)">
            Envía una invitación para que puedan completar su perfil y horarios disponibles.
          </p>
        </div>
      )}
      {isDirector && invitations.length > 0 && (
        <div className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5">
          <h2 className="font-bold text-(--c-ocean)">Invitaciones de {coachPlural}</h2>
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
      {scheduleTeacher && (
        <Sheet
          open
          onClose={() => setScheduleTeacher(null)}
          label={`Horarios de ${scheduleTeacher.name}`}
          size="2xl"
        >
          <div className="grid min-w-0 gap-4 pb-4">
            <h2 className="text-xl font-bold">Horarios de {scheduleTeacher.name}</h2>
            <CoachAgenda
              key={scheduleTeacher.id}
              schoolId={schoolId}
              coachId={scheduleTeacher.id}
              aggregateSchool
              readOnly
            />
          </div>
        </Sheet>
      )}
      {teacherProfile && (
        <Sheet
          open
          onClose={() => {
            setTeacherProfile(null)
            setLabelRevision((current) => current + 1)
          }}
          label={`Ficha de ${teacherProfile.name}`}
        >
          <div className="grid gap-4 pb-4">
            <h2 className="text-xl font-bold">{teacherProfile.name}</h2>
            {isDirector && (
              <StudentLabels studentId={teacherProfile.id} schoolId={schoolId} entity="teachers" />
            )}
            <p className="flex items-center gap-2 text-sm">
              <FiPhone aria-hidden="true" />
              {teacherProfile.phone || 'Sin teléfono'}
            </p>
            {teacherProfile.bio && (
              <p className="text-sm whitespace-pre-wrap">{teacherProfile.bio}</p>
            )}
            {!teacherProfile.profileComplete && (
              <p className="text-sm text-(--c-text-2)">Perfil pendiente de completar</p>
            )}
            {isDirector && (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={
                    teachers.find((teacher) => teacher.id === teacherProfile.id)
                      ?.canManageSchoolBookings || false
                  }
                  disabled={savingPermission === teacherProfile.id}
                  onChange={(event) =>
                    void setBookingPermission(teacherProfile, event.currentTarget.checked)
                  }
                />
                Puede aprobar reservas de la escuela
              </label>
            )}
            <button
              type="button"
              onClick={() => {
                setScheduleTeacher(teacherProfile)
                setTeacherProfile(null)
              }}
              className="btn btn-outline min-h-11 border"
            >
              <FiClock aria-hidden="true" />
              Ver horarios
            </button>
            {teacherProfile.id === selected.membership.userId && (
              <Link href="/profile" className="btn btn-ghost min-h-11">
                <FiEdit2 aria-hidden="true" />
                Actualizar datos
              </Link>
            )}
          </div>
        </Sheet>
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
  const terminology = useSchoolTerminology()
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
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
    } catch {
      setError('No se pudo enviar la invitación. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Sheet
      open
      onClose={onClose}
      label={`Invitar ${coachSingular}`}
      keyboardAware
      fullBleedMobile
      closeDisabled={saving}
    >
      <form onSubmit={submit} className="grid gap-4 px-4 pb-3 sm:px-0 sm:pb-0">
        <h2 className="text-xl font-extrabold text-(--c-ocean)">Invitar {coachSingular}</h2>
        <p className="mt-1 text-sm text-(--c-text-2)">
          Se enviará un enlace para crear o completar la cuenta de la persona invitada.
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
        <button type="submit" disabled={saving} className="btn btn-primary mt-5 min-h-11 w-full">
          {saving ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </Sheet>
  )
}
