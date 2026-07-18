'use client'

import { useKeyboardSafeArea } from '@comps/hooks/useKeyboardSafeArea'
import { useEffect, useState } from 'react'
import {
  PROGRESS_LEVELS,
  PROGRESS_RESULTS,
  PROGRESS_SUBLEVELS,
  type ProgressScaleOption,
  progressLevelInfo,
} from '@/CONSTANTS/PROGRESS_SCALE'
import { getAuthed, patchAuthed } from '@/lib/client/authed-api'
import {
  clampScale,
  normalizeLevelValue,
  type StudentProgress,
  type StudentProgressEntry,
} from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function StudentProgressModal({
  athleteId,
  studentName,
  bookingId,
  initial,
  existingEntry,
  onClose,
  onSaved,
}: {
  athleteId: string
  studentName: string
  /** Class the progress is anchored to — one entry per class. */
  bookingId: string
  initial?: StudentProgress | null
  /**
   * Entry already saved for this class: preset values and save edits it.
   * Pass `null` when known absent; leave `undefined` to fetch it here.
   */
  existingEntry?: StudentProgressEntry | null
  onClose: () => void
  onSaved: (entry: StudentProgressEntry, progress: StudentProgress) => void
}) {
  // Level/avance carry the student's current state as a starting point; the
  // session result starts unselected because it grades this session only.
  const [level, setLevel] = useState(() => normalizeLevelValue(initial?.level))
  const [subLevel, setSubLevel] = useState(() => clampScale(initial?.coachAssessment, 1))
  const [result, setResult] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(Boolean(existingEntry))
  const [loading, setLoading] = useState(existingEntry === undefined)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const keyboardSafeArea = useKeyboardSafeArea()
  const levelInfo = progressLevelInfo(level)

  const presetFromEntry = (entry: StudentProgressEntry) => {
    setLevel(normalizeLevelValue(entry.level))
    setSubLevel(clampScale(entry.coachAssessment, 1))
    setResult(entry.result ?? null)
    setNote(entry.note || '')
    setEditing(true)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per open
  useEffect(() => {
    if (existingEntry) {
      presetFromEntry(existingEntry)
      return
    }
    if (existingEntry !== undefined) return
    let cancelled = false
    getAuthed(`/api/coach/progress-entries?bookingId=${encodeURIComponent(bookingId)}`)
      .then((response) => response.json())
      .then((payload: { entry?: StudentProgressEntry | null }) => {
        if (cancelled) return
        if (payload.entry) presetFromEntry(payload.entry)
        setLoading(false)
      })
      .catch((err) => {
        reportInternalError('COACH_PROGRESS_ENTRY_LOAD', err)
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    if (result === null) return
    setStatus('saving')
    try {
      const response = await patchAuthed('/api/coach/students', {
        athleteId,
        bookingId,
        level,
        coachAssessment: subLevel,
        result,
        lastNote: note,
      })
      const payload = (await response.json()) as {
        progress: StudentProgress
        entry: StudentProgressEntry
      }
      onSaved(payload.entry, payload.progress)
    } catch (err) {
      reportInternalError('COACH_STUDENT_PROGRESS_SAVE', err)
      setStatus('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${editing ? 'Editar' : 'Agregar'} progreso de ${studentName}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm"
      style={keyboardSafeArea ? { paddingBottom: `calc(${keyboardSafeArea}px + 1rem)` } : undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-(--c-border) sm:hidden" />
        <div>
          <h3 className="text-xl font-bold text-(--c-ocean)">
            {editing ? 'Editar progreso' : 'Agregar progreso'}
          </h3>
          <p className="mt-0.5 text-sm text-(--c-text-2)">{studentName}</p>
        </div>

        <fieldset disabled={loading} className="contents">
          <ScaleRow label="Nivel" options={PROGRESS_LEVELS} selected={level} onSelect={setLevel} />
          {levelInfo && (
            <div className="rounded-[var(--r-sm)] bg-(--c-surface) px-3 py-2 text-xs leading-5 text-(--c-text-2)">
              <p className="font-bold text-(--c-ocean)">{levelInfo.title}</p>
              <p className="mt-0.5">{levelInfo.description}</p>
              {levelInfo.objectives && (
                <p className="mt-1 font-semibold">{levelInfo.objectives.join(' · ')}</p>
              )}
            </div>
          )}
          <ScaleRow
            label="Avance"
            options={PROGRESS_SUBLEVELS}
            selected={subLevel}
            onSelect={setSubLevel}
          />
          <ScaleRow
            label="Resultado"
            options={PROGRESS_RESULTS}
            selected={result}
            onSelect={setResult}
          />
        </fieldset>

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Nota (opcional)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={800}
            rows={2}
            placeholder="Observaciones de la sesión."
            className="rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 py-2 text-sm text-(--c-ocean)"
          />
        </label>

        {status === 'error' && (
          <p className="text-sm text-(--c-error,#b91c1c)">{GENERIC_USER_ERROR}</p>
        )}

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={status === 'saving' || result === null || loading}
            className="min-h-12 rounded-full bg-(--c-ocean) font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === 'saving' ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar progreso'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full font-semibold text-(--c-text-2) hover:text-(--c-ocean)"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function ScaleRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: ProgressScaleOption[]
  selected: number | null
  onSelect: (value: number) => void
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="text-sm font-semibold text-(--c-ocean)">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2">
        {options.map((option) => {
          const active = option.value === selected
          return (
            // biome-ignore lint/a11y/useSemanticElements: styled toggle button, not a native radio input
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(option.value)}
              className={`flex min-h-12 flex-col items-center justify-center rounded-[var(--r-sm)] border text-sm font-bold transition-colors ${
                active
                  ? 'border-(--c-ocean) bg-(--c-ocean) text-white'
                  : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'
              }`}
            >
              {option.emoji ? (
                <>
                  <span aria-hidden="true" className="text-xl leading-none">
                    {option.emoji}
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold">{option.label}</span>
                </>
              ) : option.sublabel ? (
                <>
                  <span>{option.label}</span>
                  <span className="mt-0.5 text-[10px] font-semibold">{option.sublabel}</span>
                </>
              ) : (
                option.label
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
