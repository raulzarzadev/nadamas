'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAuthed, getCachedAuthedData } from '@/lib/client/authed-api'
import type { TeacherClassFollowUp } from '@/lib/school-teacher-follow-ups'

type Payload = { classes: TeacherClassFollowUp[] }
export default function TeacherFollowUps({
  schoolId,
  teacherId,
}: {
  schoolId: string
  teacherId: string
}) {
  const endpoint = `/api/schools/${schoolId}/teachers/${encodeURIComponent(teacherId)}/follow-ups`
  const [data, setData] = useState<Payload | undefined>(() => getCachedAuthedData(endpoint))
  const [error, setError] = useState(false)
  const load = useCallback(
    () => getAuthed(endpoint).then((response) => response.json() as Promise<Payload>),
    [endpoint]
  )
  useEffect(() => {
    let active = true
    setError(false)
    setData(getCachedAuthedData(endpoint))
    load()
      .then((payload) => {
        if (active) setData(payload)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [endpoint, load])
  if (error)
    return (
      <div role="alert" className="grid gap-2 py-4 text-sm">
        <p>No pudimos cargar los seguimientos.</p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => {
            setError(false)
            load()
              .then(setData)
              .catch(() => setError(true))
          }}
        >
          Reintentar
        </button>
      </div>
    )
  if (!data)
    return (
      <p role="status" className="py-4 text-sm text-(--c-text-2)">
        Cargando seguimientos…
      </p>
    )
  if (!data.classes.length)
    return <p className="py-4 text-sm text-(--c-text-2)">Todavía no hay clases impartidas.</p>
  return (
    <div className="grid min-w-0 gap-2 pt-3">
      {data.classes.map((item) => (
        <article key={item.id} className="min-w-0 rounded-xl border border-(--c-border) p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                {new Date(`${item.date}T12:00:00`).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                · {item.startTime}–{item.endTime}
              </p>
              <p className="text-xs text-(--c-text-2)">
                {item.title} · {item.students} {item.students === 1 ? 'alumno' : 'alumnos'}
              </p>
            </div>
            {!item.comment && (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                Pendiente
              </span>
            )}
          </div>
          {item.comment && (
            <p className="mt-2 text-sm whitespace-pre-wrap break-words">{item.comment}</p>
          )}
        </article>
      ))}
    </div>
  )
}
