'use client'
import { useEffect, useState } from 'react'
import {
  CLASS_TOPIC_LABELS,
  type ClassEvaluation,
  type PublicClassEvaluation,
} from '@/lib/class-evaluation'
import { getAuthed } from '@/lib/client/authed-api'
import { reportInternalError } from '@/lib/user-facing-error'

export default function ClassEvaluationList({
  coachId,
  privateView = false,
}: {
  coachId?: string
  privateView?: boolean
}) {
  const [evaluations, setEvaluations] = useState<
    (PublicClassEvaluation &
      Partial<Pick<ClassEvaluation, 'privateComment'>> & { athleteName?: string })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    // Retrying intentionally reruns this request.
    void attempt
    let active = true
    setLoading(true)
    setError(false)
    const request = privateView
      ? getAuthed('/api/coach/evaluations')
      : fetch(`/api/public/coaches/${encodeURIComponent(coachId || '')}/evaluations`)
    void request
      .then(async (response) => {
        if (!response.ok) throw new Error('EVALUATIONS_LOAD')
        return response.json()
      })
      .then((data) => {
        if (active) setEvaluations(data.evaluations || [])
      })
      .catch((error) => {
        reportInternalError('CLASS_EVALUATIONS_LOAD', error)
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [coachId, privateView, attempt])
  return (
    <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4">
      <h2 className="text-lg font-bold text-[var(--c-ocean)]">
        {privateView ? 'Evaluaciones de tus clases' : 'Evaluaciones de clases'}
      </h2>
      {loading ? (
        <p role="status" className="mt-3 text-sm">
          Cargando evaluaciones…
        </p>
      ) : error ? (
        <div className="mt-3 text-sm">
          <p>No pudimos cargar las evaluaciones.</p>
          <button
            type="button"
            className="btn btn-outline mt-2 min-h-11"
            onClick={() => setAttempt(attempt + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : evaluations.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--c-text-2)]">Aún no hay evaluaciones.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {evaluations.map((evaluation) => (
            <li key={evaluation.id} className="border-t border-[var(--c-border)] pt-3">
              <p className="font-semibold text-[var(--c-ocean)]">
                <span aria-hidden="true">
                  {'★'.repeat(evaluation.rating)}
                  {'☆'.repeat(5 - evaluation.rating)}
                </span>
                <span className="sr-only">{evaluation.rating} de 5 estrellas</span>{' '}
                <span className="text-sm font-normal">· {evaluation.date}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">
                {evaluation.topics.map((topic) => CLASS_TOPIC_LABELS[topic]).join(' · ')}
              </p>
              {evaluation.publicComment && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {evaluation.publicComment}
                </p>
              )}
              {privateView && evaluation.privateComment && (
                <div className="mt-3 rounded-xl bg-[var(--c-surface)] p-3">
                  <p className="text-xs font-bold">Comentario privado al profe</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {evaluation.privateComment}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
