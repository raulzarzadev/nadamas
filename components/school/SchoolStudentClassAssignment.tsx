'use client'

import { useEffect, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import {
  type SchoolClassOccurrence,
  type SchoolStudent,
  schoolClassDisplayTitle,
} from '@/lib/school'

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export default function SchoolStudentClassAssignment({
  schoolId,
  timezone,
  student,
  onAssigned,
}: {
  schoolId: string
  timezone: string
  student: SchoolStudent
  onAssigned: () => void
}) {
  const [classes, setClasses] = useState<SchoolClassOccurrence[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [loadingError, setLoadingError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt retries the same class list.
  useEffect(() => {
    let active = true
    setClasses(null)
    setLoadingError(false)
    getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/classes`)
      .then((response) => response.json())
      .then((payload: { classes?: SchoolClassOccurrence[] }) => {
        if (!active) return
        const today = dateInTimezone(timezone)
        setClasses(
          (payload.classes || [])
            .filter(
              (item) =>
                item.type === 'group' &&
                (item.status === 'scheduled' || item.status === 'pending') &&
                item.date >= today &&
                !item.classFull &&
                !item.studentIds?.includes(student.id)
            )
            .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
        )
      })
      .catch(() => {
        if (active) setLoadingError(true)
      })
    return () => {
      active = false
    }
  }, [schoolId, student.id, timezone, attempt])

  const filteredClasses = (classes || []).filter((item) =>
    `${schoolClassDisplayTitle(item.title, item.type)} ${item.date} ${item.startTime}`
      .toLocaleLowerCase('es-MX')
      .includes(query.trim().toLocaleLowerCase('es-MX'))
  )

  async function assign() {
    if (!selectedIds.length || saving) return
    setSaving(true)
    setSaveError(false)
    setNotice('')
    const succeeded: string[] = []
    const failed: string[] = []
    for (const classId of selectedIds) {
      try {
        await postAuthed(
          `/api/schools/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(classId)}/students`,
          { studentIds: [student.id] }
        )
        succeeded.push(classId)
      } catch {
        failed.push(classId)
      }
    }
    if (succeeded.length) {
      setClasses((current) => current?.filter((item) => !succeeded.includes(item.id)) || [])
      setNotice(
        `Asignación guardada para ${student.name} en ${succeeded.length} ${succeeded.length === 1 ? 'clase' : 'clases'}.`
      )
      onAssigned()
    }
    setSelectedIds(failed)
    setSaveError(failed.length > 0)
    setSaving(false)
  }

  return (
    <section className="mt-5 rounded-[var(--r-sm)] border border-(--c-border) bg-(--c-surface) p-4">
      <h3 className="font-bold text-(--c-ocean)">Asignar a nuevas clases</h3>
      <p className="mt-1 text-sm text-(--c-text-2)">
        Elige clases grupales programadas con cupo disponible.
      </p>
      {loadingError ? (
        <div role="alert" className="mt-3 text-sm text-(--c-text-2)">
          <p>No pudimos cargar las clases disponibles.</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="btn btn-outline mt-2 min-h-11"
          >
            Reintentar
          </button>
        </div>
      ) : !classes ? (
        <p role="status" className="mt-3 text-sm text-(--c-text-2)">
          Cargando clases…
        </p>
      ) : classes.length === 0 ? (
        <p className="mt-3 text-sm text-(--c-text-2)">No hay clases disponibles para asignar.</p>
      ) : (
        <>
          <label className="mt-4 grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Buscar clase
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Nombre o fecha"
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
            />
          </label>
          <div className="mt-3 max-h-56 overflow-y-auto rounded-[var(--r-sm)] border border-(--c-border) bg-white">
            {filteredClasses.length ? (
              filteredClasses.map((item) => (
                <label
                  key={item.id}
                  className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-(--c-border) px-3 py-2 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    disabled={saving}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked
                      setSelectedIds((current) =>
                        checked ? [...current, item.id] : current.filter((id) => id !== item.id)
                      )
                    }}
                    className="h-5 w-5 shrink-0 accent-(--c-aqua-strong)"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold text-(--c-ocean)">
                      {schoolClassDisplayTitle(item.title, item.type)}
                    </span>
                    <span className="text-(--c-text-2)">
                      {item.date} · {item.startTime}–{item.endTime}
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <p className="p-3 text-sm text-(--c-text-2)">
                No encontramos clases con esa búsqueda.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void assign()}
            disabled={saving || selectedIds.length === 0}
            className="btn btn-primary mt-3 min-h-11 w-full gap-2 disabled:opacity-50"
          >
            <FiPlus aria-hidden="true" />
            {saving
              ? 'Asignando…'
              : `Asignar a ${selectedIds.length} ${selectedIds.length === 1 ? 'clase' : 'clases'}`}
          </button>
        </>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm font-semibold text-(--c-ocean)">
          {notice}
        </p>
      )}
      {saveError && (
        <p role="alert" className="mt-3 text-sm text-(--c-error,#b91c1c)">
          No se pudo asignar a todas las clases. Revisa tu selección e inténtalo de nuevo.
        </p>
      )}
    </section>
  )
}
