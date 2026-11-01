'use client'

import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import ClassTrainingEditor from '@/components/coach/ClassTrainingEditor'
import SessionShareMenu from '@/components/training/SessionShareMenu'
import Sheet from '@/components/ui/sheet'
import type { ClassTrainingBlock } from '@/lib/class-training'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import type { TrainingSelection } from '@/lib/client/training-selection'
import { reportInternalError } from '@/lib/user-facing-error'

type TrainingSession = {
  id: string
  title: string
  description: string
  training: ClassTrainingBlock[]
  updatedAt: number
  visibility: 'public' | 'private'
}
type Draft = Pick<TrainingSession, 'title' | 'description' | 'training'> & {
  id?: string
}

export default function AthleteTrainingSessions({
  createRequest,
  selection,
  onSelectTraining,
}: {
  createRequest: number
  selection?: TrainingSelection | null
  onSelectTraining?: (selection: TrainingSelection) => void
}) {
  const [items, setItems] = useState<TrainingSession[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await getAuthed('/api/athlete/training-sessions')
      if (!response.ok) throw new Error('ATHLETE_TRAINING_SESSIONS_LOAD')
      const payload = (await response.json()) as { items?: TrainingSession[] }
      setItems(payload.items || [])
    } catch (cause) {
      reportInternalError('ATHLETE_TRAINING_SESSIONS_LOAD', cause)
      setError('No pudimos cargar tus sesiones. Inténtalo de nuevo más tarde.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selection?.type === 'session' && selection.id) void load()
  }, [load, selection?.type, selection?.id])

  useEffect(() => {
    if (!createRequest) return
    setError('')
    setDraft({ title: '', description: '', training: [] })
  }, [createRequest])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || saving) return
    const title = draft.title.trim()
    if (!title) {
      setError('Escribe un nombre para el entreno.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = draft.id
        ? await patchAuthed('/api/athlete/training-sessions', { ...draft, title })
        : await postAuthed('/api/athlete/training-sessions', { ...draft, title })
      if (!response.ok) throw new Error('ATHLETE_TRAINING_SESSION_SAVE')
      if (!draft.id) {
        const payload = (await response.json()) as { item: { id: string } }
        onSelectTraining?.({ type: 'session', id: payload.item.id })
      }
      setDraft(null)
      await load()
    } catch (cause) {
      reportInternalError('ATHLETE_TRAINING_SESSION_SAVE', cause)
      setError('No pudimos guardar el entreno. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {selection?.type === 'session' &&
        (loading || error || items.length > 0 || selection?.type === 'session') && (
          <section
            className="mx-auto grid w-full min-w-0 max-w-4xl grid-cols-[minmax(0,1fr)] gap-3 px-3 pb-5"
            aria-label="Sesiones sueltas"
          >
            <h2 className="text-center text-2xl font-extrabold text-(--c-ocean)">Entreno de hoy</h2>
            {loading && (
              <p role="status" className="text-sm text-(--c-text-2)">
                Cargando sesiones…
              </p>
            )}
            {error && !draft && (
              <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
                {error}
              </p>
            )}
            {!loading &&
              !error &&
              selection?.type === 'session' &&
              !items.some((item) => item.id === selection.id) && (
                <p role="status" className="text-sm text-(--c-text-2)">
                  No encontramos esta sesión. Busca otro entreno.
                </p>
              )}
            {items
              .filter(
                (item) => !selection || selection.type !== 'session' || item.id === selection.id
              )
              .map((item) => (
                <div key={item.id} className="min-w-0">
                  <div className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm font-semibold text-(--c-ocean)">
                    <span className="min-w-0 truncate">{item.title}</span>
                    <span className="shrink-0 text-xs font-normal text-(--c-text-2)">
                      {item.training.length} {item.training.length === 1 ? 'bloque' : 'bloques'}
                    </span>
                  </div>
                  <div className="py-3">
                    {item.description && (
                      <p className="mb-3 whitespace-pre-wrap text-sm text-(--c-text-2)">
                        {item.description}
                      </p>
                    )}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                        onClick={() => {
                          setError('')
                          setDraft({
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            training: item.training,
                          })
                        }}
                      >
                        <FiEdit2 aria-hidden="true" /> Editar
                      </button>
                      <div className="ml-auto">
                        <SessionShareMenu
                          session={item}
                          accountRole="athlete"
                          onDuplicated={(id) => onSelectTraining?.({ type: 'session', id })}
                        />
                      </div>
                    </div>
                    <ClassTrainingEditor
                      blocks={item.training}
                      onChange={() => {}}
                      readOnly
                      allowTransfer={false}
                    />
                  </div>
                </div>
              ))}
          </section>
        )}
      <Sheet
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        label={draft?.id ? 'Editar sesión suelta' : 'Crear sesión suelta'}
        keyboardAware
        showFooterClose={false}
        compactFooter
        closeDisabled={saving}
        footer={
          <div className="flex min-h-14 items-center">
            <button
              type="submit"
              form="athlete-training-session-form"
              disabled={saving}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-(--c-ocean) px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar sesión'}
            </button>
          </div>
        }
      >
        {draft && (
          <form id="athlete-training-session-form" className="grid gap-3 pb-2" onSubmit={save}>
            <h2 className="text-xl font-bold">
              {draft.id ? 'Editar sesión suelta' : 'Crear sesión suelta'}
            </h2>
            <label className="grid gap-1 text-sm font-semibold">
              Nombre
              <input
                required
                maxLength={100}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Ej. Técnica y velocidad"
                className="box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Descripción (opcional)
              <textarea
                maxLength={2000}
                rows={2}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className="[field-sizing:content] box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
              />
            </label>
            <ClassTrainingEditor
              blocks={draft.training}
              onChange={(training) => setDraft({ ...draft, training })}
              allowTransfer={false}
            />
            {error && (
              <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
                {error}
              </p>
            )}
          </form>
        )}
      </Sheet>
    </>
  )
}
