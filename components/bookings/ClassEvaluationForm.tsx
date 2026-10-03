'use client'
import Sheet from '@comps/ui/sheet'
import { useState } from 'react'
import { FiStar, FiX } from 'react-icons/fi'
import { CLASS_TOPIC_LABELS, CLASS_TOPICS, type ClassEvaluation } from '@/lib/class-evaluation'
import { putAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function ClassEvaluationForm({
  booking,
  coachName,
  onClose,
  onSaved,
}: {
  booking: Booking
  coachName: string
  onClose: () => void
  onSaved: (evaluation: ClassEvaluation) => void
}) {
  const [value, setValue] = useState<ClassEvaluation>(
    booking.evaluation || { rating: 0, topics: [], publicComment: '', privateComment: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return (
    <Sheet
      open
      onClose={() => {
        if (!saving) onClose()
      }}
      label="Evaluar clase"
      keyboardAware
      fullBleedMobile
    >
      <form
        className="flex min-h-[calc(100dvh-0.5rem)] max-h-[calc(100dvh-0.5rem)] flex-col overflow-hidden sm:min-h-0 sm:max-h-[min(86dvh,44rem)]"
        onSubmit={async (event) => {
          event.preventDefault()
          if (saving) return
          if (!value.rating || !value.topics.length) {
            setError('Selecciona las estrellas y al menos un tema trabajado.')
            return
          }
          setSaving(true)
          setError('')
          try {
            const response = await putAuthed(
              `/api/bookings/${encodeURIComponent(booking.id)}/evaluation`,
              value
            )
            const data = await response.json()
            onSaved(data.evaluation)
          } catch (error) {
            reportInternalError('CLASS_EVALUATION_SAVE', error)
            setError(GENERIC_USER_ERROR)
          } finally {
            setSaving(false)
          }
        }}
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-2 sm:px-0 sm:pt-0">
          <div className="flex items-center justify-between gap-3">
            <h2 id="evaluation-title" className="text-xl font-bold">
              Evaluar clase
            </h2>
            <button
              type="button"
              aria-label="Cerrar evaluación"
              disabled={saving}
              onClick={onClose}
              className="btn btn-ghost min-h-11 min-w-11"
            >
              <FiX />
            </button>
          </div>
          <p className="text-sm">
            {coachName} · {booking.date} · {booking.startTime}
          </p>
          <fieldset disabled={saving}>
            <legend className="mb-2 font-semibold">¿Cómo estuvo la clase?</legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <label
                  key={rating}
                  className="relative grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
                >
                  <input
                    type="radio"
                    name="rating"
                    value={rating}
                    checked={value.rating === rating}
                    onChange={() => setValue({ ...value, rating })}
                    aria-label={`${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    required
                  />
                  <FiStar
                    aria-hidden="true"
                    size={30}
                    className={
                      rating <= value.rating
                        ? 'fill-amber-400 text-amber-700'
                        : 'text-[var(--c-text-2)]'
                    }
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm" aria-live="polite">
              {value.rating ? `${value.rating} de 5 estrellas` : 'Selecciona de 1 a 5 estrellas'}
            </p>
          </fieldset>
          <fieldset disabled={saving}>
            <legend className="font-semibold">¿Qué se trabajó?</legend>
            <p className="my-2 text-sm text-[var(--c-text-2)]">
              Puedes marcar una o varias opciones.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CLASS_TOPICS.map((topic) => (
                <label
                  key={topic}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--c-border)] p-3 has-checked:bg-[var(--c-surface)]"
                >
                  <input
                    type="checkbox"
                    checked={value.topics.includes(topic)}
                    onChange={(event) =>
                      setValue({
                        ...value,
                        topics: event.target.checked
                          ? [...value.topics, topic]
                          : value.topics.filter((item) => item !== topic),
                      })
                    }
                  />
                  {CLASS_TOPIC_LABELS[topic]}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="public-comment" className="font-semibold">
              Comentario público <span className="text-sm font-normal">(opcional)</span>
            </label>
            <p id="public-comment-help" className="my-2 text-sm text-[var(--c-text-2)]">
              Se mostrará en el perfil del coach.
            </p>
            <textarea
              id="public-comment"
              aria-describedby="public-comment-help"
              maxLength={2000}
              rows={3}
              disabled={saving}
              value={value.publicComment}
              onChange={(event) => setValue({ ...value, publicComment: event.target.value })}
              className="textarea w-full text-base"
            />
          </div>
          <div>
            <label htmlFor="private-comment" className="font-semibold">
              Comentario privado al profe <span className="text-sm font-normal">(opcional)</span>
            </label>
            <p id="private-comment-help" className="my-2 text-sm text-[var(--c-text-2)]">
              Solo tú y tu profesor pueden verlo.
            </p>
            <textarea
              id="private-comment"
              aria-describedby="private-comment-help"
              maxLength={2000}
              rows={3}
              disabled={saving}
              value={value.privateComment}
              onChange={(event) => setValue({ ...value, privateComment: event.target.value })}
              className="textarea w-full text-base"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-[var(--rose-tx)]">
              {error}
            </p>
          )}
        </div>
        <footer className="shrink-0 border-t border-[var(--c-border)] bg-white px-4 pb-3 pt-3 sm:px-0 sm:pb-0">
          <button
            type="submit"
            disabled={saving}
            className="btn w-full bg-[var(--c-ocean)] text-white disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar evaluación'}
          </button>
        </footer>
      </form>
    </Sheet>
  )
}
