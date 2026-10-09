'use client'

import { useEffect, useId, useState } from 'react'
import { FiEdit2, FiPlus, FiTag } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import { studentLabelColor } from '@/lib/student-label-colors'
import StudentLabelColorSelector from './StudentLabelColorSelector'

type Student = { id: string; name: string }
export type LabelList = { labels: Label[]; assignments: Record<string, string[]> }
type Label = { id: string; name: string; color?: string }
export default function StudentLabelTools({
  schoolId,
  entity = 'students',
  students,
  revision,
  onFilter,
  onUpdated,
  onData,
}: {
  entity?: 'students' | 'teachers'
  schoolId: string
  students: Student[]
  revision: number
  onFilter: (ids: string[] | null) => void
  onUpdated: () => void
  onData?: (data: LabelList) => void
}) {
  const nameInputId = useId()
  const [labels, setLabels] = useState<Label[]>([])
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [targets, setTargets] = useState<string[]>([])
  const [name, setName] = useState('')
  const [managedName, setManagedName] = useState('')
  const [color, setColor] = useState('blue')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision reloads assignments after mutations.
  useEffect(() => {
    let active = true
    setLoading(true)
    getAuthed(
      `/api/coach/student-tags?entity=${entity}&schoolId=${encodeURIComponent(schoolId)}&view=list`
    )
      .then((response) => response.json() as Promise<LabelList>)
      .then((payload) => {
        if (active) {
          setAssignments(payload.assignments)
          setLabels(payload.labels.sort((a, b) => a.name.localeCompare(b.name)))
          onData?.(payload)
          setError('')
        }
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las etiquetas. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [schoolId, entity, revision, onData])
  useEffect(() => {
    onFilter(
      filter ? Object.keys(assignments).filter((id) => assignments[id].includes(filter)) : null
    )
  }, [filter, assignments, onFilter])
  const apply = async (remove: boolean) => {
    if (busy || !managedName.trim() || !targets.length) return
    setBusy(true)
    setError('')
    const queue = [...targets]
    try {
      await Promise.all(
        Array.from({ length: Math.min(4, queue.length) }, async () => {
          while (queue.length) {
            const id = queue.shift()
            if (!id) break
            await postAuthed(
              `/api/coach/student-tags?entity=${entity}&schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(id)}`,
              { name: managedName, remove }
            )
          }
        })
      )
      setOpen(false)
      setTargets([])
      setCreating(true)
      onUpdated()
    } catch {
      setError('No pudimos actualizar todas las etiquetas. Revisa la lista y vuelve a intentarlo.')
      onUpdated()
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <section className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtrar por etiqueta">
        <button
          type="button"
          aria-pressed={!filter}
          onClick={() => setFilter('')}
          className={`btn min-h-8 h-8 border px-3 text-xs ${!filter ? 'btn-primary' : 'btn-outline'}`}
        >
          Todos
          <span className="text-[10px] tabular-nums opacity-75">({students.length})</span>
        </button>
        {labels.map((label) => (
          <button
            key={label.id}
            type="button"
            aria-pressed={filter === label.id}
            disabled={loading}
            onClick={() => setFilter(filter === label.id ? '' : label.id)}
            className={`btn btn-outline min-h-8 h-8 gap-1 border px-3 text-xs ${filter === label.id ? 'ring-2 ring-(--c-ocean) ring-offset-2' : ''}`}
            style={{
              backgroundColor: studentLabelColor(label.color).color,
              color: studentLabelColor(label.color).text,
            }}
          >
            <FiTag aria-hidden="true" />
            {label.name}
            <span className="text-[10px] tabular-nums opacity-75">
              ({students.filter((student) => assignments[student.id]?.includes(label.id)).length})
            </span>
          </button>
        ))}
        {filter && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              const label = labels.find((item) => item.id === filter)
              if (!label) return
              setEditingId(label.id)
              setName(label.name)
              setColor(label.color || 'blue')
              setError('')
              setCreating(true)
            }}
            aria-label="Editar etiqueta seleccionada"
            title="Editar etiqueta"
            className="btn btn-ghost size-8 min-h-8 p-0"
          >
            <FiEdit2 aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          disabled={loading || !students.length}
          onClick={() => {
            setName('')
            setEditingId(null)
            setError('')
            setCreating(true)
          }}
          aria-label="Crear etiqueta"
          title="Crear etiqueta"
          className="btn btn-ghost size-8 min-h-8 p-0"
        >
          <FiPlus aria-hidden="true" />
        </button>
      </section>
      {error && !open && !creating && !confirmDelete && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        closeDisabled={busy}
        keyboardAware
        label="Crear etiqueta"
      >
        <form
          className="grid min-w-0 gap-4 pb-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (busy || !name.trim() || !students.length) return
            setBusy(true)
            setError('')
            try {
              await postAuthed(
                `/api/coach/student-tags?entity=${entity}&schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(students[0].id)}`,
                { name, color, ...(editingId ? { editId: editingId } : { createOnly: true }) }
              )
              setCreating(false)
              setName('')
              onUpdated()
            } catch {
              setError('No pudimos crear la etiqueta. Inténtalo de nuevo.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <h2 className="text-xl font-bold">{editingId ? 'Editar etiqueta' : 'Etiqueta'}</h2>
          <label htmlFor={nameInputId} className="sr-only">
            Nombre de la etiqueta
          </label>
          <div className="flex min-w-0 items-center gap-2">
            <input
              id={nameInputId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              required
              disabled={busy}
              placeholder="Por ejemplo, Equipo"
              className="min-h-11 min-w-0 w-full flex-1 rounded-xl border border-(--c-border) px-3 focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
            />
            <StudentLabelColorSelector value={color} onChange={setColor} disabled={busy} modal />
          </div>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="btn btn-primary min-h-11"
          >
            {busy ? 'Guardando…' : editingId ? 'Guardar' : 'Crear'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCreating(false)
              setManagedName(name)
              setOpen(true)
            }}
            className="btn btn-ghost min-h-11"
          >
            Agregar o quitar etiquetas a {entity === 'teachers' ? 'entrenadores' : 'alumnos'}
          </button>
          {editingId && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCreating(false)
                setConfirmDelete(true)
                setError('')
              }}
              className="btn btn-ghost min-h-11 text-red-700"
            >
              Eliminar etiqueta
            </button>
          )}
          {error && (
            <p role="alert" className="text-sm">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      <Sheet
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false)
          setCreating(true)
        }}
        closeDisabled={busy}
        label="Eliminar etiqueta"
      >
        <div className="grid gap-4 pb-4">
          <h2 className="text-xl font-bold">Eliminar etiqueta</h2>
          <p className="text-sm">
            ¿Quieres eliminar «{name}»? Se quitará de{' '}
            {entity === 'teachers' ? 'los entrenadores' : 'los alumnos'} que la tienen.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmDelete(false)
                setCreating(true)
              }}
              className="btn btn-outline min-h-11 flex-1 border"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!editingId || !students.length || busy) return
                setBusy(true)
                setError('')
                try {
                  await deleteAuthed(
                    `/api/coach/student-tags?entity=${entity}&schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(students[0].id)}&labelId=${encodeURIComponent(editingId)}`
                  )
                  setConfirmDelete(false)
                  setEditingId(null)
                  setFilter('')
                  setName('')
                  onUpdated()
                } catch {
                  setError('No pudimos eliminar la etiqueta. Inténtalo de nuevo.')
                } finally {
                  setBusy(false)
                }
              }}
              className="btn min-h-11 flex-1 border-red-700 bg-red-700 text-white"
            >
              {busy ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm">
              {error}
            </p>
          )}
        </div>
      </Sheet>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false)
          setCreating(true)
          setError('')
        }}
        closeDisabled={busy}
        keyboardAware
        label="Gestionar etiquetas"
      >
        <div className="grid min-w-0 gap-4 pb-4">
          <h2 className="text-xl font-bold">Gestionar etiquetas</h2>
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Etiqueta
            <input
              list="student-label-options"
              value={managedName}
              onChange={(event) => setManagedName(event.target.value)}
              maxLength={40}
              disabled={busy}
              placeholder="Elige una o escribe una nueva"
              className="min-h-11 min-w-0 w-full rounded-xl border border-(--c-border) px-3"
            />
          </label>
          <datalist id="student-label-options">
            {labels.map((label) => (
              <option key={label.id} value={label.name} />
            ))}
          </datalist>
          <fieldset className="grid gap-1" disabled={busy}>
            <legend className="mb-2 text-sm font-semibold">
              {entity === 'teachers' ? 'Entrenadores' : 'Alumnos'} ({targets.length} seleccionados)
            </legend>
            {students.map((student) => (
              <label key={student.id} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={targets.includes(student.id)}
                  onChange={(event) =>
                    setTargets((current) =>
                      event.target.checked
                        ? [...current, student.id]
                        : current.filter((id) => id !== student.id)
                    )
                  }
                />
                {student.name}
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !managedName.trim() || !targets.length}
              onClick={() => void apply(false)}
              className="btn btn-primary min-h-11 flex-1"
            >
              Agregar etiqueta
            </button>
            <button
              type="button"
              disabled={
                busy ||
                !targets.length ||
                !labels.some(
                  (label) =>
                    label.name.toLocaleLowerCase('es') ===
                    managedName.trim().toLocaleLowerCase('es')
                )
              }
              onClick={() => void apply(true)}
              className="btn btn-outline min-h-11 flex-1 border"
            >
              Quitar etiqueta
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  )
}
