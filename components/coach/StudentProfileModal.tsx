'use client'

import { useEffect, useState } from 'react'
import Sheet from '@/components/ui/sheet'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import type { SchoolStudentHistory } from '@/lib/school-student-history'

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
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        note: item.studentNote || '',
        comments: [] as string[],
      }))
  return (
    <Sheet open onClose={onClose} label="Perfil del atleta">
      <div className="grid gap-4 pb-4">
        <h2 className="text-xl font-bold">Perfil del atleta</h2>
        <h3 className="text-lg font-bold">{profile?.name || name}</h3>
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
          <section className="grid gap-3" aria-label="Historial de clases">
            <h3 className="text-lg font-bold">Historial de clases</h3>
            {historyError && (
              <p role="alert" className="text-sm">
                {historyError}
              </p>
            )}
            {schoolId && !history && !historyError && (
              <p role="status" className="text-sm">
                Cargando historial…
              </p>
            )}
            {classes?.length === 0 && (
              <p className="text-sm text-(--c-text-2)">Todavía no hay clases registradas.</p>
            )}
            {classes && (
              <ul className="grid gap-2">
                {[...classes]
                  .sort((a, b) =>
                    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
                  )
                  .map((item) => (
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
                      {item.note ? (
                        <p className="whitespace-pre-wrap break-words">{item.note}</p>
                      ) : (
                        <p className="text-xs text-(--c-text-2)">Sin nota de esta clase.</p>
                      )}
                      {[...new Set(item.comments)].map((comment) => (
                        <p key={comment} className="whitespace-pre-wrap break-words">
                          {comment}
                        </p>
                      ))}
                    </li>
                  ))}
              </ul>
            )}
            {history && (
              <>
                <h3 className="text-lg font-bold">Comentarios</h3>
                {history.comments.length ? (
                  history.comments.map((comment) => (
                    <div key={comment.id} className="rounded-xl bg-(--c-surface) p-3 text-sm">
                      <p className="text-xs font-semibold">
                        {comment.authorName} ·{' '}
                        {new Date(comment.createdAt).toLocaleDateString('es-MX')}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-(--c-text-2)">No hay comentarios generales.</p>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </Sheet>
  )
}
