'use client'

import { useEffect, useState } from 'react'
import { FiClipboard, FiEdit3, FiPlus, FiUser, FiUsers } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import type { SchoolStudent } from '@/lib/school'
import { capitalizeSchoolTerm } from '@/lib/school'
import type {
  SchoolStudentHistory as HistoryPayload,
  SchoolHistoryClass,
} from '@/lib/school-student-history'
import SchoolStudentClassAssignment from './SchoolStudentClassAssignment'

const STATUS_LABELS: Record<SchoolHistoryClass['status'], string> = {
  taken: 'Tomada',
  scheduled: 'Confirmada',
  cancelled: 'Cancelada',
  absent: 'Ausente',
  unconfirmed: 'Sin confirmar',
}

export default function SchoolStudentHistory({
  schoolId,
  timezone,
  student,
  canAssign,
  isDirector,
  viewerId,
  onClose,
}: {
  schoolId: string
  timezone: string
  student: SchoolStudent
  canAssign: boolean
  isDirector: boolean
  viewerId: string
  onClose: () => void
}) {
  const terminology = useSchoolTerminology()
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  const coachPlural = terminology.schoolId ? terminology.coachPlural : 'coaches'
  const [history, setHistory] = useState<HistoryPayload | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [commentOpen, setCommentOpen] = useState(false)
  const [classNoteTarget, setClassNoteTarget] = useState<SchoolHistoryClass | null>(null)
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [coachFilter, setCoachFilter] = useState<string | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt deliberately reloads the same resource after a failure.
  useEffect(() => {
    let active = true
    setHistory(null)
    setError(false)
    setCoachFilter(null)
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
  const visibleClasses = coachFilter
    ? history?.classes.filter((item) => item.coachIds.includes(coachFilter)) || []
    : history?.classes || []
  const filterName = coachFilter && history ? history.coachNames[coachFilter] || null : null
  const upcomingClasses = visibleClasses
    .filter((item) => item.status === 'scheduled')
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  const previousClasses = visibleClasses.filter((item) => item.status !== 'scheduled')

  if (classNoteTarget && history)
    return (
      <SchoolStudentClassNoteModal
        schoolId={schoolId}
        student={student}
        item={classNoteTarget}
        coachId={
          classNoteTarget.coachIds.find((id) => id === viewerId) ||
          classNoteTarget.coachIds[0] ||
          ''
        }
        directorMode={isDirector}
        onClose={() => setClassNoteTarget(null)}
        onSaved={() => {
          setClassNoteTarget(null)
          setAttempt((value) => value + 1)
        }}
      />
    )
  if (commentOpen && history)
    return (
      <SchoolStudentCommentModal
        schoolId={schoolId}
        student={student}
        onClose={() => setCommentOpen(false)}
        onSaved={() => setAttempt((value) => value + 1)}
      />
    )
  if (assignmentOpen)
    return (
      <SchoolStudentClassAssignment
        schoolId={schoolId}
        timezone={timezone}
        student={student}
        open
        onClose={() => setAssignmentOpen(false)}
        onAssigned={() => setAttempt((value) => value + 1)}
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
          <div className="flex shrink-0 items-center gap-2">
            {canAssign && (
              <button
                type="button"
                onClick={() => setAssignmentOpen(true)}
                disabled={!history}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--c-ocean) px-4 text-sm font-bold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-40"
              >
                <FiPlus aria-hidden="true" /> Asignar clases
              </button>
            )}
            <button
              type="button"
              onClick={() => setCommentOpen(true)}
              disabled={!history}
              aria-label="Escribir comentario sobre el alumno"
              title="Escribir comentario"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-(--c-ocean) text-lg text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-40"
            >
              <FiClipboard aria-hidden="true" />
            </button>
          </div>
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
              <fieldset className="mt-3 flex flex-wrap gap-2">
                <legend className="sr-only">{`Filtrar por ${capitalizeSchoolTerm(coachPlural)} de ${participantSingular}`}</legend>
                {coachIds.map((id) => {
                  const active = coachFilter === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCoachFilter(active ? null : id)}
                      aria-pressed={active}
                      title={
                        active
                          ? `Quitar filtro de ${history.coachNames[id] || capitalizeSchoolTerm(coachSingular)}`
                          : `Filtrar por ${history.coachNames[id] || capitalizeSchoolTerm(coachSingular)}`
                      }
                      className={`inline-flex min-h-11 items-center rounded-[var(--r-sm)] border px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${active ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:border-(--c-aqua-strong) hover:bg-(--c-surface)'}`}
                    >
                      {history.coachNames[id] || capitalizeSchoolTerm(coachSingular)}
                    </button>
                  )
                })}
              </fieldset>
            )}
            {coachFilter && (
              <p className="mt-3 text-sm text-(--c-text-2)">
                Mostrando {visibleClasses.length} de {history.classes.length} clases
                {filterName ? ` de ${filterName}` : ''}.{' '}
                <button
                  type="button"
                  onClick={() => setCoachFilter(null)}
                  className="font-semibold text-[var(--c-aqua-strong)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
                >
                  Quitar filtro
                </button>
              </p>
            )}
            {history.classes.length === 0 ? (
              <p className="py-8 text-center text-sm text-(--c-text-2)">
                Esta persona todavía no tiene clases registradas en la escuela.
              </p>
            ) : visibleClasses.length === 0 ? (
              <p className="py-8 text-center text-sm text-(--c-text-2)">
                No hay clases con este filtro.
              </p>
            ) : (
              <>
                {upcomingClasses.length > 0 && (
                  <section className="mt-5">
                    <h3 className="mb-2 font-bold text-(--c-ocean)">Próximas clases</h3>
                    <ol className="grid gap-2">
                      {upcomingClasses.map((item) => (
                        <HistoryClassRow
                          key={item.id}
                          item={item}
                          history={history}
                          coachSingular={coachSingular}
                          canEditNote={
                            item.status !== 'cancelled' &&
                            canAssign &&
                            (isDirector || item.coachIds.includes(viewerId))
                          }
                          onEditNote={() => setClassNoteTarget(item)}
                        />
                      ))}
                    </ol>
                  </section>
                )}
                {previousClasses.length > 0 && (
                  <section className="mt-5">
                    <h3 className="mb-2 font-bold text-(--c-ocean)">Historial de clases</h3>
                    <ol className="grid gap-2">
                      {previousClasses.map((item) => (
                        <HistoryClassRow
                          key={item.id}
                          item={item}
                          history={history}
                          coachSingular={coachSingular}
                          canEditNote={
                            item.status !== 'cancelled' &&
                            canAssign &&
                            (isDirector || item.coachIds.includes(viewerId))
                          }
                          onEditNote={() => setClassNoteTarget(item)}
                        />
                      ))}
                    </ol>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}

function HistoryClassRow({
  item,
  history,
  coachSingular,
  canEditNote,
  onEditNote,
}: {
  item: SchoolHistoryClass
  history: HistoryPayload
  coachSingular: string
  canEditNote: boolean
  onEditNote: () => void
}) {
  const coachNames = item.coachIds
    .map((id) => history.coachNames[id] || capitalizeSchoolTerm(coachSingular))
    .join(', ')
  const date = new Date(`${item.date}T12:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
  const classType = /grup/i.test(item.title) ? 'Grupal' : 'Particular'
  const comments = [
    ...(item.note ? [{ id: 'class-note', label: 'Nota de clase', text: item.note }] : []),
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
  const [expanded, setExpanded] = useState(false)
  const hasMore = comments.length > 1 || comments.some((comment) => comment.text.length > 130)
  const visibleComments = expanded ? comments : comments.slice(0, 1)

  return (
    <li
      className={`grid gap-1 rounded-[var(--r-sm)] border px-3 py-2 ${
        classType === 'Grupal' ? 'border-blue-300' : 'border-(--c-border)'
      }`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-bold text-(--c-ocean)">
          {coachNames ||
            (item.coachIds.length === 0 ? 'Sin profe aún' : capitalizeSchoolTerm(coachSingular))}
        </h3>
        <div className="flex shrink-0 items-center gap-2 text-xs text-(--c-text-2)">
          <span className="whitespace-nowrap font-medium">{STATUS_LABELS[item.status]}</span>
          <time dateTime={item.date}>{date}</time>
          <time dateTime={`${item.date}T${item.startTime}`}>{item.startTime}</time>
          <span role="img" title={`Clase ${classType}`} aria-label={`Clase ${classType}`}>
            {classType === 'Grupal' ? (
              <FiUsers aria-hidden="true" />
            ) : (
              <FiUser aria-hidden="true" />
            )}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {visibleComments.length ? (
            <div className="grid gap-0 text-xs">
              {visibleComments.map((comment) => {
                const text =
                  !expanded && comment.text.length > 130
                    ? `${comment.text.slice(0, 130).trimEnd()}…`
                    : comment.text
                return (
                  <p key={comment.id} className="min-w-0 text-(--c-text-2)">
                    <span className="font-semibold text-(--c-ocean)">{comment.label}: </span>
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
              onClick={() => setExpanded((value) => !value)}
              className="min-h-6 text-xs font-semibold text-[var(--c-aqua-strong)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
            >
              Ver {expanded ? 'menos' : 'más'}
            </button>
          )}
        </div>
        {canEditNote && (
          <button
            type="button"
            onClick={onEditNote}
            aria-label={`${item.note ? 'Editar' : 'Agregar'} nota de clase para ${date}`}
            title={item.note ? 'Editar nota de clase' : 'Agregar nota de clase'}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-(--c-ocean) text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
          >
            <FiEdit3 aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

function SchoolStudentClassNoteModal({
  schoolId,
  student,
  item,
  coachId,
  directorMode,
  onClose,
  onSaved,
}: {
  schoolId: string
  student: SchoolStudent
  item: SchoolHistoryClass
  coachId: string
  directorMode: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [note, setNote] = useState(item.note)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function saveNote() {
    if (busy || note.length > 1000) return
    setBusy(true)
    setError(false)
    try {
      if (item.id.startsWith('class:')) {
        const occurrenceId = item.id.slice('class:'.length)
        await patchAuthed(
          `/api/schools/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(occurrenceId)}/students/${encodeURIComponent(student.id)}`,
          { note: note.trim() }
        )
      } else {
        await patchAuthed('/api/coach/agenda/bookings', {
          id: item.id.slice('booking:'.length),
          schoolId,
          ...(directorMode ? { coachId } : {}),
          note: note.trim(),
        })
      }
      onSaved()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      label="Nota de clase"
      keyboardAware
      fullBleedMobile
      showFooterClose={false}
      footer={
        <div className="flex flex-col gap-2 border-t border-(--c-border) bg-white px-4 py-3 sm:flex-row-reverse sm:px-0">
          <button
            type="button"
            onClick={saveNote}
            disabled={busy || note.length > 1000}
            className="min-h-11 rounded-full bg-(--c-aqua) px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar nota'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-11 rounded-full px-4 font-semibold text-(--c-text-2) hover:text-(--c-ocean)"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="grid gap-3 px-4 pb-4 sm:px-0">
        <div>
          <h2 className="text-xl font-bold text-(--c-ocean)">{item.title || 'Clase'}</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            {student.name} · {item.date} · {item.startTime}–{item.endTime}
          </p>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-(--c-ocean)">
          Nota de esta clase
          <textarea
            rows={5}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
            disabled={busy}
            placeholder="Escribe una nota sobre esta clase…"
            className="w-full resize-y rounded-[var(--r-sm)] border border-(--c-border) p-3 text-sm font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-(--c-error,#b91c1c)">
            No se pudo guardar la nota. Inténtalo de nuevo.
          </p>
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
