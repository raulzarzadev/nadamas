'use client'

import Sheet from '@comps/ui/sheet'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiClock, FiEdit2, FiPhone, FiSearch, FiSend, FiShield } from 'react-icons/fi'
import CoachAgenda from '@/components/coach/CoachAgenda'
import StudentLabels from '@/components/coach/StudentLabels'
import StudentLabelTools, { type LabelList } from '@/components/coach/StudentLabelTools'
import PlanLimitNotice, { planLimitMessageOf } from '@/components/subscriptions/PlanLimitNotice'
import ClassStudentRow from '@/components/ui/class-student-row'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed, getCachedAuthedData, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import { normalizeEntitySearch } from '@/lib/entity-matching'
import { capitalizeSchoolTerm, type SchoolInvitation, schoolMembershipHasRole } from '@/lib/school'
import SchoolNoSelection from './SchoolNoSelection'
import SchoolSelector from './SchoolSelector'
import TeacherFollowUps from './TeacherFollowUps'
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
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null)
  const [profileTab, setProfileTab] = useState<'schedule' | 'follow-ups'>('schedule')
  const [editingTeacherProfile, setEditingTeacherProfile] = useState(false)
  const cachedTeachers = selectedId
    ? getCachedAuthedData<{ teachers?: Teacher[] }>(`/api/schools/${selectedId}/teachers`)
    : undefined
  const [teachers, setTeachers] = useState<Teacher[]>(cachedTeachers?.teachers || [])
  const [invitations, setInvitations] = useState<SchoolInvitation[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [teacherQuery, setTeacherQuery] = useState('')
  const [loading, setLoading] = useState(!cachedTeachers)
  const [message, setMessage] = useState<string | null>(null)
  const [savingPermission, setSavingPermission] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId) return
    let active = true
    const teachersPath = `/api/schools/${selectedId}/teachers`
    const invitationsPath = `/api/schools/${selectedId}/invitations`
    const isDirector = schoolMembershipHasRole(selected?.membership, 'director')
    const cached = getCachedAuthedData<{ teachers?: Teacher[] }>(teachersPath)
    const cachedInvites = isDirector
      ? getCachedAuthedData<{ invitations?: SchoolInvitation[] }>(invitationsPath)
      : undefined
    setTeachers(cached?.teachers || [])
    setInvitations(cachedInvites?.invitations?.filter((item) => item.role === 'teacher') || [])
    setLoading(!cached)
    setMessage(null)
    getAuthed(teachersPath)
      .then((response) => response.json() as Promise<{ teachers?: Teacher[] }>)
      .then((payload) => {
        if (active) setTeachers(payload.teachers || [])
      })
      .catch(() => {
        if (active)
          setMessage(
            `No se pudieron cargar ${terminology.schoolId ? terminology.coachPlural : 'los coaches'}.`
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    if (isDirector) {
      getAuthed(invitationsPath)
        .then((response) => response.json() as Promise<{ invitations?: SchoolInvitation[] }>)
        .then((payload) => {
          if (active)
            setInvitations(payload.invitations?.filter((item) => item.role === 'teacher') || [])
        })
        .catch(() => {
          if (active) setMessage('No se pudieron cargar las invitaciones.')
        })
    }
    return () => {
      active = false
    }
  }, [selectedId, selected?.membership, terminology.coachPlural, terminology.schoolId])

  if (schoolStatus === 'loading') return <ProfileLoadingSkeleton />
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
      <SchoolSelector schools={schools} selectedId={selected.school.id} onChange={selectSchool} />
      <div className="grid gap-2">
        <label className="relative min-w-0">
          <span className="sr-only">Buscar {coachSingular}</span>
          <FiSearch
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--c-text-2)"
          />
          <input
            type="search"
            value={teacherQuery}
            onChange={(event) => setTeacherQuery(event.target.value)}
            placeholder={`Buscar ${coachSingular}`}
            className="min-h-11 w-full rounded-full border border-(--c-border) bg-white pr-3 pl-10 text-sm"
          />
        </label>
        {isDirector && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-(--c-border) bg-white px-3 text-xs font-semibold text-(--c-ocean) transition-colors hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
            >
              <FiSend aria-hidden="true" /> Invitar {coachSingular}
            </button>
          </div>
        )}
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
              (teacher) =>
                (!isDirector || filteredIds === null || filteredIds.includes(teacher.id)) &&
                normalizeEntitySearch(teacher.name).includes(normalizeEntitySearch(teacherQuery))
            )
            .map((teacher) => (
              <div key={teacher.id} className="rounded-xl border border-(--c-border)">
                <ClassStudentRow
                  name={`${teacher.name}${teacher.id === selected.membership.userId ? ' (tú)' : ''}`}
                  labels={
                    isDirector && (
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
                        compact
                      />
                    )
                  }
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeacherProfile(false)
                        setProfileTab('schedule')
                        setTeacherProfile(teacher)
                      }}
                      aria-label={`Ver horarios de ${teacher.name}`}
                      title="Ver horarios"
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-(--c-border) bg-white px-2.5 text-xs font-semibold text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                    >
                      <FiClock aria-hidden="true" /> {teacher.availability.length}
                    </button>
                  }
                  onEdit={() => {
                    setEditingTeacherProfile(false)
                    setProfileTab('schedule')
                    setTeacherProfile(teacher)
                  }}
                  editLabel={`Abrir ficha de ${teacher.name}`}
                />
              </div>
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
      {teacherProfile && (
        <Sheet
          open
          onClose={() => {
            setTeacherProfile(null)
            setLabelRevision((current) => current + 1)
          }}
          label={`Ficha de ${teacherProfile.name}`}
          size="2xl"
        >
          <div className="grid min-w-0 gap-3 pb-4">
            <header className="grid min-w-0 gap-1.5">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <h2 className="min-w-0 text-base font-bold break-words">{teacherProfile.name}</h2>
                {teacherProfile.id === selected.membership.userId ? (
                  <Link
                    href="/profile"
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-(--c-aqua-strong)"
                  >
                    <FiEdit2 aria-hidden="true" /> Editar perfil
                  </Link>
                ) : (
                  isDirector && (
                    <button
                      type="button"
                      aria-expanded={editingTeacherProfile}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-(--c-aqua-strong)"
                      onClick={() => setEditingTeacherProfile((value) => !value)}
                    >
                      <FiEdit2 aria-hidden="true" />{' '}
                      {editingTeacherProfile ? 'Listo' : 'Editar perfil'}
                    </button>
                  )
                )}
              </div>
              {isDirector && (
                <div className="min-w-0 [&>div]:justify-start">
                  <StudentLabels
                    studentId={teacherProfile.id}
                    schoolId={schoolId}
                    entity="teachers"
                    readOnly={!editingTeacherProfile}
                    horizontal
                    tiny
                  />
                </div>
              )}
              <p className="flex items-center gap-1.5 text-xs text-(--c-text-2)">
                <FiPhone aria-hidden="true" />
                {teacherProfile.phone || 'Sin teléfono'}
              </p>
              {editingTeacherProfile && (
                <div className="grid gap-2 pt-2">
                  {teacherProfile.bio && (
                    <p className="text-xs whitespace-pre-wrap text-(--c-text-2)">
                      {teacherProfile.bio}
                    </p>
                  )}
                  {!teacherProfile.profileComplete && (
                    <p className="text-xs text-(--c-text-2)">Perfil pendiente de completar</p>
                  )}
                  <label className="flex min-h-11 items-center gap-2 text-xs">
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
                </div>
              )}
            </header>
            <section aria-label={`Horarios de ${teacherProfile.name}`} className="min-w-0 pt-2">
              <div role="tablist" aria-label="Información del entrenador" className="flex gap-4">
                {(
                  [
                    ['schedule', 'Horarios'],
                    ['follow-ups', 'Seguimientos'],
                  ] as const
                )
                  .filter(
                    ([tab]) =>
                      tab === 'schedule' ||
                      isDirector ||
                      teacherProfile.id === selected.membership.userId
                  )
                  .map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={profileTab === tab}
                      aria-controls={`teacher-${tab}-panel`}
                      id={`teacher-${tab}-tab`}
                      tabIndex={profileTab === tab ? 0 : -1}
                      onClick={() => setProfileTab(tab)}
                      onKeyDown={(event) => {
                        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                          event.preventDefault()
                          const next =
                            event.key === 'Home'
                              ? 'schedule'
                              : event.key === 'End'
                                ? 'follow-ups'
                                : tab === 'schedule'
                                  ? 'follow-ups'
                                  : 'schedule'
                          const target = document.getElementById(`teacher-${next}-tab`)
                          if (target) {
                            setProfileTab(next)
                            target.focus()
                          }
                        }
                      }}
                      className={`min-h-11 border-b-2 text-sm font-semibold ${profileTab === tab ? 'border-primary text-(--c-ocean)' : 'border-transparent text-(--c-text-2)'}`}
                    >
                      {label}
                    </button>
                  ))}
              </div>
              <div
                role="tabpanel"
                id="teacher-schedule-panel"
                aria-labelledby="teacher-schedule-tab"
                hidden={profileTab !== 'schedule'}
              >
                <CoachAgenda
                  key={`${schoolId}:${teacherProfile.id}`}
                  schoolId={schoolId}
                  coachId={teacherProfile.id}
                  aggregateSchool
                  readOnly={!isDirector}
                  manageSchoolSchedule={isDirector}
                  allowSchoolScheduleEdit={isDirector}
                  scheduleCoachOptions={teachers.map(({ id, name }) => ({ id, name }))}
                />
              </div>
              {profileTab === 'follow-ups' && (
                <div
                  role="tabpanel"
                  id="teacher-follow-ups-panel"
                  aria-labelledby="teacher-follow-ups-tab"
                >
                  <TeacherFollowUps schoolId={schoolId} teacherId={teacherProfile.id} />
                </div>
              )}
            </section>
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
  const [limitMessage, setLimitMessage] = useState<string | null>(null)
  const terminology = useSchoolTerminology()
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setLimitMessage(null)
    try {
      const response = await postAuthed(`/api/schools/${schoolId}/invitations`, {
        email,
        role: 'teacher',
      })
      const payload = (await response.json()) as { invitation: SchoolInvitation }
      onCreated(payload.invitation)
    } catch (cause) {
      const limit = planLimitMessageOf(cause)
      if (limit) setLimitMessage(limit)
      else setError('No se pudo enviar la invitación. Inténtalo de nuevo.')
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
        {limitMessage && (
          <div className="mt-3">
            <PlanLimitNotice message={limitMessage} />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary mt-5 min-h-11 w-full">
          {saving ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </Sheet>
  )
}
