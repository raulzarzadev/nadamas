'use client'

import { useEffect, useId, useState } from 'react'
import ScheduleTag from '@/components/ui/schedule-tag'
import Sheet from '@/components/ui/sheet'
import { getAuthed, putAuthed } from '@/lib/client/authed-api'
import { UNASSIGNED_SCHOOL_COACH_ID } from '@/lib/school'

export type ClassNotesTarget = {
  schoolId: string
  coachId: string
  coachName?: string | null
  date: string
  startTime: string
  endTime: string
  groupType: 'particular' | 'grupal'
}

export default function ClassNotesModal({
  target,
  onClose,
}: {
  target: ClassNotesTarget
  onClose: () => void
}) {
  const id = useId()
  const [note, setNote] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const endpoint = `/api/schools/${encodeURIComponent(target.schoolId)}/class-notes?coachId=${encodeURIComponent(target.coachId)}&date=${encodeURIComponent(target.date)}&time=${encodeURIComponent(target.startTime)}`
  useEffect(() => {
    let active = true
    getAuthed(endpoint)
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return
        setNote(payload.note || '')
        setOriginal(payload.note || '')
        setLoaded(true)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las notas. Cierra y vuelve a intentarlo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [endpoint])
  const save = async () => {
    if (!loaded || loading || saving || note === original) return
    setSaving(true)
    setError('')
    try {
      await putAuthed(endpoint, { note })
      onClose()
    } catch {
      setError('No pudimos guardar las notas. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Sheet
      open
      onClose={onClose}
      closeDisabled={saving}
      keyboardAware
      label="Notas de la clase"
      footer={
        <div className="flex justify-end px-4 sm:px-0">
          <button
            type="button"
            disabled={!loaded || loading || saving || note === original}
            onClick={() => void save()}
            className="btn btn-primary min-h-11"
          >
            {saving ? 'Guardando…' : 'Guardar notas'}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 px-4 pb-4 sm:px-0">
        <h2 className="text-xl font-bold">Notas de la clase</h2>
        <ScheduleTag
          date={new Date(`${target.date}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
          time={`${target.startTime}–${target.endTime}`}
          coachName={target.coachName || 'Sin profe aún'}
          unassigned={target.coachId === UNASSIGNED_SCHOOL_COACH_ID}
          groupType={target.groupType}
        />
        <label htmlFor={id} className="text-sm font-semibold">
          Notas generales
        </label>
        {loading ? (
          <p role="status" className="text-sm">
            Cargando notas…
          </p>
        ) : (
          <textarea
            id={id}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={saving || !loaded}
            maxLength={4000}
            rows={6}
            placeholder="Escribe observaciones generales sobre esta clase…"
            className="min-h-40 w-full resize-y rounded-xl border border-(--c-border) bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-[var(--c-error,#b91c1c)]">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}
