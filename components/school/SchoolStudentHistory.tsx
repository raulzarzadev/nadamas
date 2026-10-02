'use client'

import { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed } from '@/lib/client/authed-api'
import type { SchoolStudent } from '@/lib/school'
import { capitalizeSchoolTerm } from '@/lib/school'
import type {
  SchoolStudentHistory as HistoryPayload,
  SchoolHistoryClass,
} from '@/lib/school-student-history'

const STATUS_LABELS: Record<SchoolHistoryClass['status'], string> = {
  taken: 'Clase tomada',
  scheduled: 'Programada',
  cancelled: 'Cancelada',
  absent: 'Sin asistencia registrada',
  unconfirmed: 'Asistencia sin confirmar',
}

export default function SchoolStudentHistory({
  schoolId,
  student,
  onClose,
}: {
  schoolId: string
  student: SchoolStudent
  onClose: () => void
}) {
  const terminology = useSchoolTerminology()
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  const coachPlural = terminology.schoolId ? terminology.coachPlural : 'coaches'
  const [history, setHistory] = useState<HistoryPayload | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const dialog = closeButton.current?.closest('[role="dialog"]')
      const buttons = dialog?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      const first = buttons?.[0]
      const last = buttons?.[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      trigger?.focus()
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt deliberately reloads the same resource after a failure.
  useEffect(() => {
    let active = true
    setHistory(null)
    setError(false)
    getAuthed(
      `/api/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(student.id)}/history`
    )
      .then((response) => response.json())
      .then((payload: HistoryPayload) => {
        if (active) setHistory(payload)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [schoolId, student.id, attempt])

  const coachIds = [...new Set(history?.classes.flatMap((item) => item.coachIds) || [])]
  const taken = history?.classes.filter((item) => item.status === 'taken').length || 0
  return (
    <Sheet open onClose={onClose} label={`Historial de ${student.name}`} keyboardAware>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-(--c-ocean)">Historial de {participantSingular}</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">{student.name} · En esta escuela</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar historial"
          ref={closeButton}
          className="btn btn-ghost btn-circle min-h-11"
        >
          <FiX aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <div role="alert" className="mt-5 text-sm text-(--c-text-2)">
          <p>No pudimos cargar el historial. Inténtalo de nuevo.</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="btn btn-outline mt-3 min-h-11"
          >
            Reintentar
          </button>
        </div>
      ) : !history ? (
        <p role="status" className="py-10 text-center text-sm text-(--c-text-2)">
          Cargando historial…
        </p>
      ) : (
        <>
          <p className="mt-5 font-semibold text-(--c-ocean)">
            {taken} {taken === 1 ? 'clase tomada' : 'clases tomadas'} · {coachIds.length}{' '}
            {coachIds.length === 1 ? coachSingular : coachPlural}
          </p>
          {coachIds.length > 0 && (
            <ul
              aria-label={`${capitalizeSchoolTerm(coachPlural)} de ${participantSingular}`}
              className="mt-3 flex flex-wrap gap-2"
            >
              {coachIds.map((id) => (
                <li key={id} className="badge badge-outline h-auto px-3 py-2">
                  {history.coachNames[id] || capitalizeSchoolTerm(coachSingular)}
                </li>
              ))}
            </ul>
          )}
          {history.classes.length === 0 ? (
            <p className="py-8 text-center text-sm text-(--c-text-2)">
              Esta persona todavía no tiene clases registradas en la escuela.
            </p>
          ) : (
            <ol className="mt-5 grid gap-3">
              {history.classes.map((item) => (
                <li key={item.id} className="rounded-[var(--r-sm)] border border-(--c-border) p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-(--c-ocean)">{item.title}</h3>
                    <span className="text-xs font-semibold text-(--c-text-2)">
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-(--c-text-2)">
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    · {item.startTime}–{item.endTime}
                  </p>
                  <p className="mt-1 text-sm text-(--c-ocean)">
                    {item.coachIds
                      .map((id) => history.coachNames[id] || capitalizeSchoolTerm(coachSingular))
                      .join(', ')}
                  </p>
                  {item.location && (
                    <p className="mt-1 text-xs text-(--c-text-2)">{item.location}</p>
                  )}
                  {item.evaluations.length ? (
                    <div className="mt-3 grid gap-2 border-t border-(--c-border) pt-3">
                      {item.evaluations.map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-sm"
                        >
                          <h4 className="font-semibold text-(--c-ocean)">
                            {evaluation.direction === 'from-coach'
                              ? `Evaluación de ${coachSingular}`
                              : `Evaluación para ${coachSingular}`}{' '}
                            ·{' '}
                            {history.coachNames[evaluation.coachId] ||
                              capitalizeSchoolTerm(coachSingular)}
                          </h4>
                          {evaluation.rating !== undefined && (
                            <p className="mt-1">{evaluation.rating} / 5 estrellas</p>
                          )}
                          {evaluation.level && (
                            <p className="mt-1">
                              Nivel y avance: {evaluation.level}
                              {evaluation.result ? ` · Resultado: ${evaluation.result} / 4` : ''}
                            </p>
                          )}
                          {evaluation.comment && (
                            <p className="mt-2 whitespace-pre-wrap text-(--c-text-2)">
                              {evaluation.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-(--c-text-2)">Sin evaluaciones registradas.</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Sheet>
  )
}
