'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiPlus, FiTag } from 'react-icons/fi'
import LabelChip from '@/components/ui/label-chip'
import Sheet from '@/components/ui/sheet'
import { getAuthed, getCachedAuthedData, postAuthed } from '@/lib/client/authed-api'
import { studentLabelColor } from '@/lib/student-label-colors'
import StudentLabelColorSelector from './StudentLabelColorSelector'

type Label = { id: string; name: string; color?: string }
export default function StudentLabels({
  studentId,
  schoolId,
  entity = 'students',
  readOnly = false,
  compact = false,
  horizontal = false,
  tiny = false,
  data,
}: {
  studentId: string
  entity?: 'students' | 'teachers'
  schoolId?: string
  readOnly?: boolean
  compact?: boolean
  horizontal?: boolean
  tiny?: boolean
  data?: { labels: Label[]; selected: string[] }
}) {
  const endpoint = `/api/coach/student-tags?entity=${entity}&studentId=${encodeURIComponent(studentId)}${schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ''}`
  const cached = getCachedAuthedData<{ labels: Label[]; selected: string[] }>(endpoint)
  const cachedList = getCachedAuthedData<{
    labels: Label[]
    assignments: Record<string, string[]>
  }>(
    `/api/coach/student-tags?entity=${entity}&schoolId=${encodeURIComponent(schoolId || '')}&view=list`
  )
  const [storedLabels, setLabels] = useState<Label[]>(cached?.labels || cachedList?.labels || [])
  const [storedSelected, setSelected] = useState<string[]>(
    cached?.selected || cachedList?.assignments[studentId] || []
  )
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('blue')
  const [loading, setLoading] = useState(!cached && !cachedList && !data)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
  const add = async (label: string, labelColor = color) => {
    if (!label.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await postAuthed(endpoint, { name: label, color: labelColor })
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
  async function removeLabel(label: Label) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await postAuthed(endpoint, { name: label.name, remove: true })
      setSelected((current) => current.filter((id) => id !== label.id))
    } catch {
      setError('No pudimos quitar la etiqueta. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div
        className={`flex items-center gap-1.5 ${horizontal ? (tiny ? 'min-w-0 flex-wrap justify-end py-0' : 'min-w-0 flex-nowrap overflow-x-auto py-1 [&>span]:shrink-0') : `flex-wrap ${readOnly ? 'min-w-0' : 'max-w-44 shrink-0 justify-end'}`}`}
      >
        {labels
          .filter((label) => selected.includes(label.id))
          .map((label) => (
            <LabelChip
              key={label.id}
              label={label}
              size={tiny ? 'tiny' : 'compact'}
              disabled={busy}
              onRemove={!readOnly ? () => void removeLabel(label) : undefined}
            />
          ))}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={loading}
            className={`relative inline-flex shrink-0 items-center gap-1 rounded-full text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50 before:absolute before:-inset-y-1.5 ${compact ? 'h-6 min-h-6 border border-(--c-border) px-1.5 text-[10px] leading-tight' : 'min-h-8 px-2 text-xs'}`}
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
                      onClick={() => void add(label.name, label.color || 'blue')}
                      style={{
                        backgroundColor: studentLabelColor(label.color).color,
                        color: studentLabelColor(label.color).text,
                      }}
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
                    className="h-11 min-w-0 w-full max-w-full box-border rounded-xl border border-(--c-border) bg-white px-3 text-sm font-normal text-(--c-ocean) outline-none focus:border-(--c-ocean) focus:ring-2 focus:ring-(--c-border) disabled:opacity-50"
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
