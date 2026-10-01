'use client'

import { useState } from 'react'
import { postAuthed } from '@/lib/client/authed-api'

export default function SchoolReviewForm({
  schoolId,
  occurrenceId,
  reviewerRole,
  teacherId,
  studentId,
  subjectName,
}: {
  schoolId: string
  occurrenceId: string
  reviewerRole: 'teacher' | 'guardian' | 'student'
  teacherId: string
  studentId: string
  subjectName: string
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      await postAuthed(`/api/schools/${schoolId}/reviews`, {
        occurrenceId,
        rating,
        comment,
        teacherId,
        studentId,
      })
      setMessage('Evaluación guardada.')
      setOpen(false)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'No se pudo guardar la evaluación.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="mt-4 border-t border-(--c-border) pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-sm font-bold text-(--c-ocean-mid)"
      >
        {reviewerRole === 'teacher' ? `Evaluar a ${subjectName}` : `Evaluar a ${subjectName}`}
      </button>
      {open && (
        <div className="mt-3 grid gap-3 rounded-[var(--r-sm)] bg-(--c-surface) p-3">
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Calificación
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="min-h-10 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-2 font-normal"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Comentario privado
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className="rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 py-2 font-normal"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="btn btn-primary min-h-10"
          >
            {saving ? 'Guardando…' : 'Guardar evaluación'}
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-xs text-(--c-text-2)">{message}</p>}
    </div>
  )
}
