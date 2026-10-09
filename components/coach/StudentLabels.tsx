'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiPlus, FiTag } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import { studentLabelColor } from '@/lib/student-label-colors'
import StudentLabelColorSelector from './StudentLabelColorSelector'

type Label = { id: string; name: string; color?: string }
export default function StudentLabels({
  studentId,
  schoolId,
  entity = 'students',
  readOnly = false,
  compact = false,
  data,
}: {
  studentId: string
  entity?: 'students' | 'teachers'
  schoolId?: string
  readOnly?: boolean
  compact?: boolean
  data?: { labels: Label[]; selected: string[] }
}) {
  const [storedLabels, setLabels] = useState<Label[]>([])
  const [storedSelected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('blue')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endpoint = `/api/coach/student-tags?entity=${entity}&studentId=${encodeURIComponent(studentId)}${schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ''}`
  useEffect(() => {
    if (data) return
    let active = true
    getAuthed(endpoint)
      .then((response) => response.json())
      .then((payload: { labels: Label[]; selected: string[] }) => {
        if (active) {
          setLabels(payload.labels)
          setSelected(payload.selected)
        }
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las etiquetas.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [endpoint, data])
  const labels = data?.labels || storedLabels
  const selected = data?.selected || storedSelected
  const add = async (label: string) => {
    if (!label.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await postAuthed(endpoint, { name: label, color })
      const response = await getAuthed(endpoint)
      const payload = (await response.json()) as { labels: Label[]; selected: string[] }
      setLabels(payload.labels)
      setSelected(payload.selected)
      setName('')
      setOpen(false)
    } catch {
      setError('No pudimos guardar la etiqueta. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-1.5 ${readOnly ? 'min-w-0' : 'max-w-44 shrink-0 justify-end'}`}
      >
        {labels
          .filter((label) => selected.includes(label.id))
          .map((label) => (
            <span
              key={label.id}
              title={label.name}
              style={{
                backgroundColor: studentLabelColor(label.color).color,
                color: studentLabelColor(label.color).text,
              }}
              className={
                compact
                  ? 'inline-flex max-w-20 items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] leading-tight text-(--c-text-2)'
                  : 'inline-flex items-center gap-1 rounded-full border border-(--c-border) bg-(--c-surface) px-3 py-1 text-xs font-semibold'
              }
            >
              <FiTag aria-hidden="true" className="shrink-0" />
              <span className="truncate">{label.name}</span>
            </span>
          ))}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={loading}
            className="relative inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50 before:absolute before:-inset-y-1.5"
          >
            <FiPlus aria-hidden="true" />
            <FiTag aria-hidden="true" />
            Etiqueta
          </button>
        )}
        {error && !open && !readOnly && (
          <p role="alert" className="basis-full text-sm">
            {error}
          </p>
        )}
      </div>
      {open &&
        createPortal(
          <Sheet
            open={open}
            onClose={() => setOpen(false)}
            label="Agregar etiqueta"
            keyboardAware
            closeDisabled={busy}
          >
            <div className="grid min-w-0 gap-4 pb-4">
              <h2 className="text-xl font-bold">Agregar etiqueta</h2>
              <div className="flex flex-wrap gap-2">
                {labels
                  .filter((label) => !selected.includes(label.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void add(label.name)}
                      className="btn btn-outline min-h-11 gap-1 border"
                    >
                      <FiTag aria-hidden="true" />
                      {label.name}
                    </button>
                  ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void add(name)
                }}
                className="grid min-w-0 gap-3"
              >
                <label className="grid min-w-0 gap-2 text-sm font-semibold">
                  Crear una etiqueta nueva
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={40}
                    required
                    disabled={busy}
                    placeholder="Nombre de la etiqueta"
                    className="min-h-11 min-w-0 w-full rounded-xl border border-(--c-border) px-3 focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                  />
                </label>
                <StudentLabelColorSelector value={color} onChange={setColor} disabled={busy} />
                <button
                  type="submit"
                  disabled={busy || !name.trim()}
                  className="btn btn-primary min-h-11"
                >
                  {busy ? 'Guardando…' : 'Crear y agregar'}
                </button>
              </form>
              {error && (
                <p role="alert" className="text-sm">
                  {error}
                </p>
              )}
            </div>
          </Sheet>,
          document.body
        )}
    </>
  )
}
