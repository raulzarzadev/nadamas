'use client'

import { useEffect, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { SchoolStudent } from '@/lib/school'
import { capitalizeSchoolTerm } from '@/lib/school'
import type {
  SchoolStudentHistory as HistoryPayload,
  SchoolHistoryClass,
} from '@/lib/school-student-history'

const STATUS_LABELS: Record<SchoolHistoryClass['status'], string> = {
  taken: 'Tomada',
  scheduled: 'Confirmada',
  cancelled: 'Cancelada',
  absent: 'Ausente',
  unconfirmed: 'Sin confirmar',
}

function durationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null
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
  const [expandedComments, setExpandedComments] = useState<Set<string>>(() => new Set())
  const [commentOpen, setCommentOpen] = useState(false)
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

  if (commentOpen && history)
    return (
      <SchoolStudentCommentModal
        schoolId={schoolId}
        student={student}
        onClose={() => setCommentOpen(false)}
        onSaved={() => setAttempt((value) => value + 1)}
      />
    )

  return (
    <Sheet
      open
      onClose={onClose}
      label={`Historial de ${student.name}`}
      keyboardAware
      fullBleedMobile
      size="2xl"
    >
      <div className="px-4 pb-3 sm:px-0 sm:pb-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-(--c-ocean)">
              Historial de {participantSingular}
            </h2>
            <p className="mt-1 text-sm text-(--c-text-2)">{student.name} · En esta escuela</p>
          </div>
          <button
            type="button"
            onClick={() => setCommentOpen(true)}
            disabled={!history}
            aria-label="Escribir comentario sobre una clase"
            title="Escribir comentario"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-(--c-ocean) text-lg text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-40"
          >
            <FiEdit3 aria-hidden="true" />
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
            {history.comments.length > 0 && (
              <section className="mt-5 rounded-[var(--r-sm)] border border-(--c-border) bg-(--c-surface) p-4">
                <h3 className="font-bold text-(--c-ocean)">Comentarios sobre {student.name}</h3>
                <ul className="mt-2 grid gap-2">
                  {history.comments.map((comment) => (
                    <li key={comment.id} className="text-sm text-(--c-text-2)">
                      <span className="font-semibold text-(--c-ocean)">{comment.authorName}: </span>
                      <span className="whitespace-pre-wrap">{comment.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
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
              <ol className="mt-5 grid gap-2">
                {history.classes.map((item) => {
                  const coachNames = item.coachIds
                    .map((id) => history.coachNames[id] || capitalizeSchoolTerm(coachSingular))
                    .join(', ')
                  const date = new Date(`${item.date}T12:00:00`).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })
                  const duration = durationMinutes(item.startTime, item.endTime)
                  const comments = [
                    ...(item.note
                      ? [{ id: 'class-note', label: 'Comentario', text: item.note }]
                      : []),
                    ...item.evaluations.map((evaluation) => ({
                      id: evaluation.id,
                      label:
                        evaluation.direction === 'from-coach'
                          ? `De ${history.coachNames[evaluation.coachId] || capitalizeSchoolTerm(coachSingular)}`
                          : `Para ${history.coachNames[evaluation.coachId] || capitalizeSchoolTerm(coachSingular)}`,
                      text: [
                        evaluation.comment,
                        evaluation.rating !== undefined ? `${evaluation.rating} / 5 estrellas` : '',
                        evaluation.level
                          ? `Nivel y avance: ${evaluation.level}${evaluation.result ? ` · Resultado: ${evaluation.result} / 4` : ''}`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    })),
                  ].filter((comment) => comment.text)
                  const expanded = expandedComments.has(item.id)
                  const hasMore =
                    comments.length > 1 || comments.some((comment) => comment.text.length > 130)
                  const visibleComments = expanded ? comments : comments.slice(0, 1)

                  return (
                    <li
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-[var(--r-sm)] border border-(--c-border) px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:gap-x-5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-bold text-(--c-ocean)">
                            {coachNames || capitalizeSchoolTerm(coachSingular)}
                          </h3>
                          {item.title && (
                            <p className="truncate text-xs text-(--c-text-2)">{item.title}</p>
                          )}
                        </div>
                      </div>
                      <time dateTime={item.date} className="text-sm text-(--c-text-2)">
                        {date}
                      </time>
                      {duration && (
                        <span className="text-sm text-(--c-text-2)">{duration} min</span>
                      )}
                      <span className="justify-self-end text-xs font-semibold text-(--c-text-2)">
                        {STATUS_LABELS[item.status]}
                      </span>
                      <div className="col-span-2 min-w-0 sm:col-span-4">
                        {visibleComments.length ? (
                          <div className="grid gap-1 text-sm">
                            {visibleComments.map((comment) => {
                              const text =
                                !expanded && comment.text.length > 130
                                  ? `${comment.text.slice(0, 130).trimEnd()}…`
                                  : comment.text
                              return (
                                <p key={comment.id} className="min-w-0 text-(--c-text-2)">
                                  <span className="font-semibold text-(--c-ocean)">
                                    {comment.label}:{' '}
                                  </span>
                                  <span className="whitespace-pre-wrap">{text}</span>
                                </p>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-(--c-text-2)">Sin comentarios registrados.</p>
                        )}
                        {hasMore && (
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() =>
                              setExpandedComments((current) => {
                                const next = new Set(current)
                                if (next.has(item.id)) next.delete(item.id)
                                else next.add(item.id)
                                return next
                              })
                            }
                            className="mt-1 min-h-8 text-sm font-semibold text-[var(--c-aqua-strong)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
                          >
                            Ver {expanded ? 'menos' : 'más'}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}

function SchoolStudentCommentModal({
  schoolId,
  student,
  onClose,
  onSaved,
}: {
  schoolId: string
  student: SchoolStudent
  onClose: () => void
  onSaved: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function saveComment() {
    if (!text.trim() || busy) return
    setBusy(true)
    setError(false)
    try {
      await postAuthed(
        `/api/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(student.id)}/history/comments`,
        { text: text.trim() }
      )
      onSaved()
      onClose()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} label="Agregar comentario compartido" keyboardAware>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-(--c-ocean)">Comentario sobre el alumno</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">{student.name}</p>
          <p className="mt-2 text-sm text-(--c-text-2)">
            Este comentario podrán verlo el alumno y sus profesores.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-semibold text-(--c-ocean)">
          Comentario
          <textarea
            rows={5}
            maxLength={1000}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            disabled={busy}
            placeholder="Escribe un comentario sobre el alumno…"
            className="w-full resize-y rounded-[var(--r-sm)] border border-(--c-border) p-3 text-sm font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-(--c-error,#b91c1c)">
            No se pudo guardar el comentario. Inténtalo de nuevo.
          </p>
        )}
        <button
          type="button"
          onClick={() => void saveComment()}
          disabled={!text.trim() || busy}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-(--c-aqua) px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar comentario'}
        </button>
      </div>
    </Sheet>
  )
}
