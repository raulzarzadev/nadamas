'use client'

import { useEffect, useState } from 'react'
import Sheet from '@/components/ui/sheet'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import type { SchoolStudentHistory } from '@/lib/school-student-history'
import StudentLabels from './StudentLabels'

type Profile = {
  id?: string
  athleteId?: string
  name: string
  email?: string | null
  studentEmail?: string
  phone?: string
  address?: string
  birthDate?: string
  guardianName?: string
  guardianPhone?: string
  guardianEmail?: string
  totalClasses?: number
  classes?: Booking[]
}

export default function StudentProfileModal({
  studentId,
  schoolId,
  name,
  onClose,
}: {
  studentId: string
  schoolId?: string
  name: string
  onClose: () => void
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<SchoolStudentHistory | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [panel, setPanel] = useState<'classes' | 'scheduled' | 'comments' | null>(null)
  useEffect(() => {
    let active = true
    const endpoint = schoolId
      ? `/api/schools/${encodeURIComponent(schoolId)}/students?includeAgendaStudents=true`
      : `/api/coach/students?historyAthlete=${encodeURIComponent(studentId)}`
    getAuthed(endpoint)
      .then((response) => response.json())
      .then((payload: { students?: Profile[] }) => {
        if (!active) return
        const found = payload.students?.find(
          (student) => student.id === studentId || student.athleteId === studentId
        )
        if (found) setProfile(found)
        else setError('No pudimos encontrar los datos de este atleta.')
      })
      .catch(() => {
        if (active) setError('No pudimos cargar el perfil. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [studentId, schoolId])
  useEffect(() => {
    if (!schoolId || !profile) return
    let active = true
    getAuthed(
      `/api/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(profile.id || studentId)}/history`
    )
      .then((response) => response.json())
      .then((payload: SchoolStudentHistory) => {
        if (active) setHistory(payload)
      })
      .catch(() => {
        if (active) setHistoryError('No pudimos cargar el historial. Cierra y vuelve a intentarlo.')
      })
    return () => {
      active = false
    }
  }, [schoolId, profile, studentId])
  const classes = schoolId
    ? history?.classes.map((item) => ({
        id: item.id,
        taken: item.status === 'taken',
        scheduled: item.status === 'scheduled',
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        note: item.note,
        comments: item.evaluations
          .filter((evaluation) => evaluation.direction === 'from-coach' && evaluation.comment)
          .map((evaluation) => evaluation.comment),
      }))
    : profile?.classes?.map((item) => ({
        id: item.id,
        taken: item.status === 'completed' || item.attended === true,
        scheduled:
          item.status !== 'cancelled' &&
          item.status !== 'completed' &&
          new Date(`${item.date}T${item.endTime}`).getTime() > Date.now(),
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        note: item.studentNote || '',
        comments: [] as string[],
      }))
  const takenClasses = (classes || [])
    .filter((item) => item.taken)
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
  const comments = [
    ...(history?.comments || []).map((item) => ({
      id: item.id,
      text: item.text,
      context: `${item.authorName} · ${new Date(item.createdAt).toLocaleDateString('es-MX')}`,
    })),
    ...(classes || []).flatMap((item) => [
      ...(item.note
        ? [{ id: `${item.id}:note`, text: item.note, context: `${item.date} · ${item.startTime}` }]
        : []),
      ...item.comments.map((text) => ({
        id: `${item.id}:${text}`,
        text,
        context: `${item.date} · ${item.startTime}`,
      })),
    ]),
  ]
  const scheduledClasses = (classes || [])
    .filter((item) => item.scheduled)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  const panelClasses = panel === 'scheduled' ? scheduledClasses : takenClasses
  const panelTitle =
    panel === 'scheduled'
      ? 'Clases agendadas'
      : panel === 'classes'
        ? 'Clases tomadas'
        : 'Comentarios'
  if (panel)
    return (
      <Sheet open onClose={() => setPanel(null)} label={panelTitle}>
        <div className="grid gap-3 pb-4">
          <h2 className="text-xl font-bold">
            {panelTitle} ({panel !== 'comments' ? panelClasses.length : comments.length})
          </h2>
          <p className="text-sm font-semibold">{profile?.name || name}</p>
          {panel !== 'comments' ? (
            <ul className="grid gap-2">
              {panelClasses.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-2 rounded-xl border border-(--c-border) p-3 text-sm"
                >
                  <strong>
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {item.startTime}–{item.endTime}
                  </strong>
                  {item.note && <p className="whitespace-pre-wrap break-words">{item.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid gap-2">
              {comments.map((item) => (
                <li key={item.id} className="rounded-xl border border-(--c-border) p-3 text-sm">
                  <p className="text-xs text-(--c-text-2)">{item.context}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{item.text}</p>
                </li>
              ))}
            </ul>
          )}
          {(panel !== 'comments' ? panelClasses.length : comments.length) === 0 && (
            <p className="text-sm text-(--c-text-2)">
              {panel !== 'comments'
                ? 'No hay clases registradas en esta lista.'
                : 'Todavía no hay comentarios.'}
            </p>
          )}
          <button
            type="button"
            onClick={() => setPanel(null)}
            className="btn btn-outline min-h-11 border"
          >
            Volver al perfil
          </button>
        </div>
      </Sheet>
    )
  return (
    <Sheet open onClose={onClose} label={`Perfil de ${profile?.name || name}`}>
      <div className="grid gap-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">Perfil de {profile?.name || name}</h2>
          {profile && <StudentLabels studentId={profile.id || studentId} schoolId={schoolId} />}
        </div>
        {loading && (
          <p role="status" className="text-sm">
            Cargando perfil…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm">
            {error}
          </p>
        )}
        {profile && (
          <dl className="grid gap-3 rounded-xl border border-(--c-border) bg-(--c-surface) p-4 text-sm">
            {[
              ['Correo', profile.studentEmail || profile.email],
              ['Teléfono', profile.phone],
              ['Fecha de nacimiento', profile.birthDate],
              ['Dirección', profile.address],
              ['Responsable', profile.guardianName],
              ['Teléfono del responsable', profile.guardianPhone],
              ['Correo del responsable', profile.guardianEmail],
              [
                'Clases registradas contigo',
                profile.totalClasses === undefined ? undefined : String(profile.totalClasses),
              ],
            ].map(([label, value]) =>
              value ? (
                <div key={label}>
                  <dt className="text-xs text-(--c-text-2)">{label}</dt>
                  <dd className="break-words font-semibold">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        )}
        {profile && (
          <section className="grid gap-2" aria-label="Historial del atleta">
            {historyError && (
              <p role="alert" className="text-sm">
                {historyError}
              </p>
            )}
            {!classes && !historyError && (
              <p role="status" className="text-sm">
                Cargando historial…
              </p>
            )}
            <button
              type="button"
              disabled={!classes}
              onClick={() => setPanel('scheduled')}
              className="btn btn-outline min-h-11 justify-between border"
            >
              Clases agendadas <strong>{scheduledClasses.length}</strong>
            </button>
            <button
              type="button"
              disabled={!classes}
              onClick={() => setPanel('classes')}
              className="btn btn-outline min-h-11 justify-between border"
            >
              Clases tomadas <strong>{takenClasses.length}</strong>
            </button>
            <button
              type="button"
              disabled={!classes}
              onClick={() => setPanel('comments')}
              className="btn btn-outline min-h-11 justify-between border"
            >
              Comentarios <strong>{comments.length}</strong>
            </button>
          </section>
        )}
      </div>
    </Sheet>
  )
}
