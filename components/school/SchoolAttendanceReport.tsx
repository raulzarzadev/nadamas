'use client'

import { useCallback, useEffect, useState } from 'react'
import { FiClipboard } from 'react-icons/fi'
import AttendanceModal from '@/components/coach/AttendanceModal'
import Sheet from '@/components/ui/sheet'
import { getAuthed } from '@/lib/client/authed-api'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import type {
  AttendanceReportClass,
  SchoolAttendanceReport as Report,
} from '@/lib/school-attendance-report'

export default function SchoolAttendanceReport({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="btn btn-outline min-h-11 gap-2"
        onClick={() => setOpen(true)}
      >
        <FiClipboard aria-hidden="true" />
        Pases de lista
      </button>
      {open && <ReportSheet key={schoolId} schoolId={schoolId} onClose={() => setOpen(false)} />}
    </>
  )
}

function ReportSheet({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const [data, setData] = useState<Report | null>(null)
  const [view, setView] = useState<'classes' | 'students'>('classes')
  const [selected, setSelected] = useState<AttendanceReportClass | null>(null)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  useSchoolAgendaUpdates(schoolId, reload)
  useEffect(() => {
    void revision
    let active = true
    setError(false)
    setLoading(true)
    getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/attendance/report`)
      .then(async (response) => {
        if (!response.ok) throw new Error('ATTENDANCE_REPORT_READ')
        return response.json() as Promise<Report>
      })
      .then((payload) => {
        if (active) setData(payload)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [schoolId, revision])
  const students =
    data?.students.filter((student) =>
      student.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))
    ) || []
  return (
    <>
      <Sheet open={!selected} onClose={onClose} label="Pases de lista" size="2xl">
        <div className="grid min-w-0 gap-4">
          <h2 className="text-lg font-bold">Pases de lista</h2>
          <fieldset className="flex flex-wrap gap-2" aria-label="Vista de asistencias">
            <button
              type="button"
              aria-pressed={view === 'classes'}
              className={`btn min-h-11 ${view === 'classes' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setView('classes')}
            >
              Por horario
            </button>
            <button
              type="button"
              aria-pressed={view === 'students'}
              className={`btn min-h-11 ${view === 'students' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setView('students')}
            >
              Por persona
            </button>
          </fieldset>
          {error ? (
            <div role="alert">
              <p>No pudimos cargar los pases de lista. Inténtalo de nuevo.</p>
              <button type="button" className="btn btn-outline mt-2" onClick={reload}>
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <p role="status">Cargando asistencias…</p>
          ) : view === 'classes' ? (
            <>
              <p className="text-sm text-(--c-text-2)">
                Horarios finalizados de los últimos 3 días, del más reciente al más antiguo.
                Asistencias / personas inscritas.
              </p>
              {data?.classes.length ? (
                <ul className="divide-y divide-(--c-border)">
                  {data.classes.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left"
                        onClick={() => setSelected(item)}
                      >
                        <span>
                          <span className="block font-semibold">
                            {new Date(`${item.date}T12:00:00`).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            · {item.startTime}–{item.endTime}
                          </span>
                          <span className="text-sm text-(--c-text-2)">
                            {item.title || 'Clase'} · Ver pase de lista
                          </span>
                        </span>
                        <span
                          className="badge badge-outline whitespace-nowrap"
                          title={`${item.attended} asistencias de ${item.enrolled} personas inscritas`}
                        >
                          {item.attended}/{item.enrolled}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay horarios finalizados en los últimos 3 días.</p>
              )}
            </>
          ) : (
            <>
              <label className="grid gap-1 text-sm">
                Buscar persona
                <input
                  className="input min-h-11 w-full"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nombre"
                />
              </label>
              <p className="text-sm text-(--c-text-2)">
                Asistencias registradas este mes, de lunes a domingo y hoy. Las clases restantes
                excluyen las reservadas.
              </p>
              {students.length ? (
                <div className="overflow-x-auto">
                  <table className="table w-full text-sm">
                    <thead>
                      <tr>
                        {[
                          'Nombre',
                          'Este mes',
                          'Esta semana',
                          'Hoy',
                          'Vencimiento del plan',
                          'Clases restantes',
                        ].map((label) => (
                          <th key={label} scope="col">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <th scope="row">{student.name}</th>
                          <td>{student.month}</td>
                          <td>{student.week}</td>
                          <td>{student.today}</td>
                          <td>{expiration(student.expiresOn, data?.today || '')}</td>
                          <td>{student.remaining ?? 'No aplica'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No hay personas para mostrar.</p>
              )}
            </>
          )}
        </div>
      </Sheet>
      {selected && (
        <AttendanceModal
          schoolId={schoolId}
          date={selected.date}
          occurrenceId={selected.bookingCoachId ? undefined : selected.id}
          bookingBased={Boolean(selected.bookingCoachId)}
          initialSlot={
            selected.bookingCoachId
              ? { coachId: selected.bookingCoachId, startTime: selected.startTime }
              : undefined
          }
          onClose={() => {
            setSelected(null)
            reload()
          }}
          onUpdated={reload}
        />
      )}
    </>
  )
}

function expiration(date: string | null, today: string) {
  if (!date) return 'No aplica'
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000
  )
  if (days < 0) return `Venció hace ${Math.abs(days)} ${days === -1 ? 'día' : 'días'}`
  if (days === 0) return 'Vencido hoy'
  return days === 1 ? 'En 1 día' : `En ${days} días`
}
