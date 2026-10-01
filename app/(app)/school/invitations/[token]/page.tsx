'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiArrowLeft, FiCheck, FiUsers } from 'react-icons/fi'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { SchoolInvitationStudentData } from '@/lib/school'
import { GENERIC_USER_ERROR } from '@/lib/user-facing-error'

interface InvitationPayload {
  schoolId: string
  schoolName: string
  schoolLogoUrl: string | null
  role: 'teacher' | 'guardian' | 'student'
  email: string
  status: string
  expiresAt: number
  studentId?: string | null
  studentData?: SchoolInvitationStudentData | null
}

export default function SchoolInvitationPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token
  const [invitation, setInvitation] = useState<InvitationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [studentCreated, setStudentCreated] = useState(false)
  const [useInvitationData, setUseInvitationData] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    relationship: '',
    bio: '',
    birthDate: '',
    gender: 'varonil',
  })
  const [student, setStudent] = useState({
    name: '',
    birthDate: '',
    gender: 'varonil',
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
  })

  useEffect(() => {
    getAuthed(`/api/school-invitations/${token}`)
      .then((response) => response.json() as Promise<{ invitation: InvitationPayload }>)
      .then((payload) => {
        setInvitation(payload.invitation)
        if (payload.invitation.role === 'student' && payload.invitation.studentData) {
          setProfile((current) => ({
            ...current,
            name: payload.invitation.studentData?.name || current.name,
            birthDate: payload.invitation.studentData?.birthDate || current.birthDate,
            gender: payload.invitation.studentData?.gender || current.gender,
          }))
        }
      })
      .catch(() => setError('No encontramos esta invitación.'))
      .finally(() => setLoading(false))
  }, [token])

  async function accept(takeInvitationData = false) {
    if (!invitation || saving) return
    setSaving(true)
    setError(null)
    try {
      await postAuthed(`/api/school-invitations/${token}`, {
        ...profile,
        useInvitationData: takeInvitationData,
      })
      setStudent((current) => ({
        ...current,
        guardianName: profile.name,
        guardianRelationship: profile.relationship,
        guardianPhone: profile.phone,
      }))
      setAccepted(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : GENERIC_USER_ERROR)
    } finally {
      setSaving(false)
    }
  }

  async function createStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!invitation || saving) return
    setSaving(true)
    setError(null)
    try {
      await postAuthed(`/api/schools/${invitation.schoolId}/students`, {
        ...student,
        gender: student.gender,
      })
      setStudentCreated(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : GENERIC_USER_ERROR)
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Cargando invitación…</div>
  if (!invitation)
    return (
      <div className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-6 text-center text-(--c-text-2)">
        {error}
      </div>
    )

  if (accepted && invitation.role === 'guardian' && !studentCreated) {
    return (
      <section className="mx-auto flex max-w-xl flex-col gap-5">
        <div className="rounded-[var(--r-md)] bg-(--c-ocean) p-6 text-white">
          <p className="text-sm font-semibold text-(--c-aqua-light)">Acceso confirmado</p>
          <h1 className="mt-2 text-2xl font-extrabold">Registra al primer alumno</h1>
          <p className="mt-2 text-white/75">Puedes agregar más hijos después desde tu escuela.</p>
        </div>
        <form
          onSubmit={createStudent}
          className="flex flex-col gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7"
        >
          <Field
            label="Nombre completo del alumno"
            value={student.name}
            onChange={(value) => setStudent({ ...student, name: value })}
            required
          />
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Fecha de nacimiento
            <input
              required
              type="date"
              value={student.birthDate}
              onChange={(event) => setStudent({ ...student, birthDate: event.target.value })}
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Rama / género
            <select
              value={student.gender}
              onChange={(event) => setStudent({ ...student, gender: event.target.value })}
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
            >
              <option value="varonil">Varonil</option>
              <option value="femenil">Femenil</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <Field
            label="Nombre del tutor"
            value={student.guardianName}
            onChange={(value) => setStudent({ ...student, guardianName: value })}
          />
          <Field
            label="Parentesco"
            value={student.guardianRelationship}
            onChange={(value) => setStudent({ ...student, guardianRelationship: value })}
            placeholder="Mamá, papá, tutor…"
          />
          <Field
            label="Teléfono del tutor"
            value={student.guardianPhone}
            onChange={(value) => setStudent({ ...student, guardianPhone: value })}
            type="tel"
          />
          {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
          <button type="submit" disabled={saving} className="btn btn-primary min-h-12">
            {saving ? 'Guardando…' : 'Agregar alumno'}
          </button>
        </form>
      </section>
    )
  }

  if (studentCreated || accepted) {
    const destination = invitation.role === 'student' ? '/athlete/bookings' : '/school'
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-8 text-center shadow-[var(--shadow-sm)]">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-(--c-surface) text-2xl text-(--c-aqua-strong)">
          <FiCheck aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-extrabold text-(--c-ocean)">Todo listo</h1>
        <p className="text-(--c-text-2)">
          {invitation.role === 'teacher'
            ? 'Ya formas parte del equipo de coaches.'
            : invitation.role === 'student'
              ? 'Tu perfil quedó ligado al registro de la escuela.'
              : 'El alumno quedó registrado en la escuela.'}
        </p>
        <button
          type="button"
          onClick={() => router.push(destination)}
          className="btn btn-primary min-h-11"
        >
          {invitation.role === 'student' ? 'Ver mis próximas clases' : 'Ir al modo escuela'}
        </button>
      </section>
    )
  }

  if (invitation.role === 'student' && invitation.studentData && useInvitationData === null) {
    const data = invitation.studentData
    return (
      <section className="mx-auto flex max-w-xl flex-col gap-5">
        <div className="rounded-[var(--r-md)] bg-(--c-ocean) p-6 text-white sm:p-8">
          <p className="text-sm font-semibold text-(--c-aqua-light)">Revisa la invitación</p>
          <h1 className="mt-2 text-2xl font-extrabold">La escuela ya capturó estos datos</h1>
          <p className="mt-2 text-white/75">
            Decide si quieres tomarlos para ligar tu perfil o registrar otros datos.
          </p>
        </div>
        <div className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7">
          <dl className="grid gap-3 text-sm">
            <DataRow label="Nombre" value={data.name} />
            <DataRow label="Fecha de nacimiento" value={data.birthDate} />
            <DataRow label="Rama / género" value={data.gender} />
            {data.guardianName && <DataRow label="Tutor" value={data.guardianName} />}
            {data.guardianRelationship && (
              <DataRow label="Parentesco" value={data.guardianRelationship} />
            )}
          </dl>
        </div>
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={saving || invitation.status !== 'pending'}
            onClick={() => void accept(true)}
            className="btn btn-primary min-h-12"
          >
            {saving ? 'Vinculando…' : 'Tomar datos y ligar mi perfil'}
          </button>
          <button
            type="button"
            disabled={saving || invitation.status !== 'pending'}
            onClick={() => {
              setUseInvitationData(false)
              setProfile((current) => ({
                ...current,
                name: '',
                birthDate: '',
                gender: 'varonil',
              }))
            }}
            className="btn btn-outline min-h-12"
          >
            Usar mis propios datos
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-5">
      <Link
        href="/school"
        className="inline-flex items-center gap-2 text-sm font-semibold text-(--c-ocean-mid)"
      >
        <FiArrowLeft aria-hidden="true" /> Regresar
      </Link>
      <div className="rounded-[var(--r-md)] bg-(--c-ocean) p-6 text-white sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-(--c-aqua) text-xl text-(--c-ocean)">
          <FiUsers aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold text-(--c-aqua-light)">Invitación a escuela</p>
        <h1 className="mt-1 text-3xl font-extrabold">{invitation.schoolName}</h1>
        <p className="mt-2 text-white/75">
          Fuiste invitado como{' '}
          {invitation.role === 'teacher'
            ? 'coach'
            : invitation.role === 'student'
              ? 'alumno'
              : 'padre, madre o tutor'}
          .
        </p>
      </div>
      <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <Field
          label="Nombre completo"
          value={profile.name}
          onChange={(value) => setProfile({ ...profile, name: value })}
          required
        />
        <Field
          label="Teléfono"
          value={profile.phone}
          onChange={(value) => setProfile({ ...profile, phone: value })}
          type="tel"
        />
        {invitation.role === 'student' && (
          <>
            <Field
              label="Fecha de nacimiento"
              value={profile.birthDate}
              onChange={(value) => setProfile({ ...profile, birthDate: value })}
              type="date"
              required
            />
            <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
              Rama / género
              <select
                value={profile.gender}
                onChange={(event) => setProfile({ ...profile, gender: event.target.value })}
                className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
              >
                <option value="varonil">Varonil</option>
                <option value="femenil">Femenil</option>
                <option value="otro">Otro</option>
              </select>
            </label>
          </>
        )}
        {invitation.role === 'guardian' ? (
          <Field
            label="Parentesco"
            value={profile.relationship}
            onChange={(value) => setProfile({ ...profile, relationship: value })}
            placeholder="Mamá, papá, tutor…"
          />
        ) : invitation.role === 'teacher' ? (
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Presentación
            <textarea
              value={profile.bio}
              onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
              rows={3}
              className="rounded-[var(--r-sm)] border border-(--c-border) px-3 py-2 font-normal"
            />
          </label>
        ) : null}
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        {invitation.role === 'student' && useInvitationData === false && (
          <p className="rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
            Captura tus datos para vincular tu perfil sin tomar los datos de la escuela.
          </p>
        )}
        <button
          type="button"
          disabled={saving || invitation.status !== 'pending'}
          onClick={() => void accept(false)}
          className="btn btn-primary min-h-12"
        >
          {saving ? 'Confirmando…' : 'Aceptar invitación'}
        </button>
      </div>
    </section>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-(--c-border) pb-2 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="font-semibold text-(--c-text-2)">{label}</dt>
      <dd className="font-bold text-(--c-ocean)">{value}</dd>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
      />
    </label>
  )
}
