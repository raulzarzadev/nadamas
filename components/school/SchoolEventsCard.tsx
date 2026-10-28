'use client'

import { useCallback, useEffect, useState } from 'react'
import { FiCalendar, FiPlus, FiTrash2 } from 'react-icons/fi'
import { uploadSchoolImage } from '@/firebase/school-logos/main'
import {
  AuthedApiError,
  deleteAuthed,
  getAuthed,
  patchAuthed,
  postAuthed,
} from '@/lib/client/authed-api'
import type { SchoolEvent, SchoolEventLink } from '@/lib/school-events'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

const MAX_LINKS = 5
const FIELD =
  'min-h-11 w-full rounded-(--r-sm) border border-(--c-border) bg-white px-3 text-sm text-(--c-text)'

interface Draft {
  id: string | null
  date: string
  time: string
  title: string
  description: string
  photoUrl: string | null
  links: SchoolEventLink[]
  visibility: 'public' | 'private'
}

const emptyDraft = (): Draft => ({
  id: null,
  date: '',
  time: '',
  title: '',
  description: '',
  photoUrl: null,
  links: [],
  visibility: 'public',
})

const draftOf = (event: SchoolEvent): Draft => ({
  id: event.id,
  date: event.date,
  time: event.time ?? '',
  title: event.title,
  description: event.description,
  photoUrl: event.photoUrl,
  links: event.links.map((link) => ({ ...link })),
  visibility: event.visibility,
})

export default function SchoolEventsCard({ schoolId }: { schoolId: string }) {
  const [upcoming, setUpcoming] = useState<SchoolEvent[]>([])
  const [past, setPast] = useState<SchoolEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const read = async (scope: 'upcoming' | 'past') => {
        const response = await getAuthed(`/api/schools/${schoolId}/events?scope=${scope}`)
        return ((await response.json()) as { events: SchoolEvent[] }).events
      }
      const [next, previous] = await Promise.all([read('upcoming'), read('past')])
      setUpcoming(next)
      setPast(previous)
    } catch (error) {
      reportInternalError('SCHOOL_EVENTS_LOAD_FAILED', error)
      setMessage(GENERIC_USER_ERROR)
    } finally {
      setLoaded(true)
    }
  }, [schoolId])

  useEffect(() => {
    refresh()
  }, [refresh])

  function fail(error: unknown, code: string) {
    if (error instanceof AuthedApiError && error.status === 400 && error.message)
      setMessage(error.message)
    else {
      reportInternalError(code, error)
      setMessage(GENERIC_USER_ERROR)
    }
  }

  function startDraft(next: Draft) {
    setDraft(next)
    setFile(null)
    setMessage(null)
    setConfirming(null)
  }

  function patchDraft(patch: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function patchLink(index: number, patch: Partial<SchoolEventLink>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            links: current.links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
          }
        : current
    )
  }

  async function save() {
    if (!draft) return
    setBusy(true)
    setMessage(null)
    try {
      const photoUrl = file
        ? await uploadSchoolImage(file, 'school-events', () => {})
        : draft.photoUrl
      const body = {
        date: draft.date,
        time: draft.time || null,
        title: draft.title,
        description: draft.description,
        photoUrl,
        links: draft.links.filter((link) => link.label.trim() || link.url.trim()),
        visibility: draft.visibility,
      }
      if (draft.id) await patchAuthed(`/api/schools/${schoolId}/events/${draft.id}`, body)
      else await postAuthed(`/api/schools/${schoolId}/events`, body)
      setDraft(null)
      setFile(null)
      await refresh()
    } catch (error) {
      fail(error, 'SCHOOL_EVENT_SAVE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    setMessage(null)
    try {
      await deleteAuthed(`/api/schools/${schoolId}/events/${id}`)
      setConfirming(null)
      if (draft?.id === id) setDraft(null)
      await refresh()
    } catch (error) {
      fail(error, 'SCHOOL_EVENT_DELETE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  const renderList = (title: string, events: SchoolEvent[]) =>
    events.length > 0 && (
      <section aria-labelledby={`events-${title}`} className="mt-5 grid gap-2">
        <h3 id={`events-${title}`} className="text-sm font-bold text-(--c-ocean)">
          {title}
        </h3>
        <ul className="grid gap-2">
          {events.map((event) => (
            <li key={event.id} className="grid gap-2 rounded-(--r-sm) bg-(--c-surface) p-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-(--c-ocean)">{event.title}</p>
                <p className="text-xs text-(--c-text-2)">
                  {event.date}
                  {event.time ? ` · ${event.time}` : ''} ·{' '}
                  {event.visibility === 'public' ? 'Público' : 'Privado'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startDraft(draftOf(event))}
                  className="btn btn-outline btn-sm min-h-11"
                >
                  Editar
                </button>
                {confirming === event.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(event.id)}
                      className="btn btn-error btn-sm min-h-11"
                    >
                      Confirmar eliminación
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirming(null)}
                      className="btn btn-ghost btn-sm min-h-11"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming(event.id)}
                    className="btn btn-ghost btn-sm min-h-11 text-rose-700"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    )

  return (
    <section
      aria-busy={busy}
      className="min-w-0 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean)">
          <FiCalendar aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-(--c-ocean)">Eventos</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            Publica eventos para tus visitantes o solo para tus miembros.
          </p>
        </div>
      </div>

      {!draft && (
        <button
          type="button"
          onClick={() => startDraft(emptyDraft())}
          className="btn btn-primary btn-sm mt-4 min-h-11"
        >
          <FiPlus aria-hidden="true" /> Nuevo evento
        </button>
      )}

      {draft && (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Fecha
            <input
              type="date"
              required
              value={draft.date}
              onChange={(event) => patchDraft({ date: event.target.value })}
              className={FIELD}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Hora (opcional)
            <input
              type="time"
              value={draft.time}
              onChange={(event) => patchDraft({ time: event.target.value })}
              className={FIELD}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Título
            <input
              type="text"
              required
              maxLength={120}
              value={draft.title}
              onChange={(event) => patchDraft({ title: event.target.value })}
              className={FIELD}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Descripción
            <textarea
              rows={3}
              maxLength={2000}
              value={draft.description}
              onChange={(event) => patchDraft({ description: event.target.value })}
              className={`${FIELD} py-2`}
            />
          </label>

          <div className="grid gap-2">
            {draft.photoUrl && !file && (
              // biome-ignore lint/performance/noImgElement: remote storage preview
              <img
                src={draft.photoUrl}
                alt="Foto actual del evento"
                className="aspect-video w-full rounded-(--r-sm) object-cover"
              />
            )}
            <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
              Foto (opcional)
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </label>
            {draft.photoUrl && !file && (
              <button
                type="button"
                onClick={() => patchDraft({ photoUrl: null })}
                className="btn btn-ghost btn-sm min-h-11 w-fit"
              >
                Quitar foto
              </button>
            )}
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-(--c-ocean)">Enlaces (opcional)</legend>
            {draft.links.map((link, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
              <div key={index} className="grid gap-2 rounded-(--r-sm) bg-(--c-surface) p-2">
                <input
                  type="text"
                  aria-label={`Texto del enlace ${index + 1}`}
                  placeholder="Texto"
                  maxLength={60}
                  value={link.label}
                  onChange={(event) => patchLink(index, { label: event.target.value })}
                  className={FIELD}
                />
                <input
                  type="url"
                  aria-label={`URL del enlace ${index + 1}`}
                  placeholder="https://"
                  value={link.url}
                  onChange={(event) => patchLink(index, { url: event.target.value })}
                  className={FIELD}
                />
                <button
                  type="button"
                  aria-label={`Quitar enlace ${index + 1}`}
                  onClick={() => patchDraft({ links: draft.links.filter((_, i) => i !== index) })}
                  className="btn btn-ghost btn-sm min-h-11 w-fit text-rose-700"
                >
                  <FiTrash2 aria-hidden="true" /> Quitar
                </button>
              </div>
            ))}
            {draft.links.length < MAX_LINKS && (
              <button
                type="button"
                onClick={() => patchDraft({ links: [...draft.links, { label: '', url: '' }] })}
                className="btn btn-outline btn-sm min-h-11 w-fit"
              >
                Agregar enlace
              </button>
            )}
          </fieldset>

          <fieldset className="grid gap-1">
            <legend className="text-sm font-semibold text-(--c-ocean)">Visibilidad</legend>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="event-visibility"
                checked={draft.visibility === 'public'}
                onChange={() => patchDraft({ visibility: 'public' })}
              />
              Público
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="event-visibility"
                checked={draft.visibility === 'private'}
                onChange={() => patchDraft({ visibility: 'private' })}
              />
              Privado (solo miembros)
            </label>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary btn-sm min-h-11">
              Guardar evento
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDraft(null)}
              className="btn btn-ghost btn-sm min-h-11"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}

      {renderList('Próximos', upcoming)}
      {renderList('Pasados', past)}
      {loaded && upcoming.length === 0 && past.length === 0 && !draft && (
        <p className="mt-4 text-sm text-(--c-text-2)">Aún no tienes eventos.</p>
      )}
    </section>
  )
}
