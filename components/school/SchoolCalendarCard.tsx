'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiCheck, FiCopy, FiExternalLink } from 'react-icons/fi'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'

interface CalendarState {
  connected: boolean
  calendarUrl: string | null
}

export default function SchoolCalendarCard({ schoolId }: { schoolId: string }) {
  const [state, setState] = useState<CalendarState>({ connected: false, calendarUrl: null })
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    getAuthed(`/api/schools/${schoolId}/calendar`)
      .then((response) => response.json() as Promise<CalendarState>)
      .then(setState)
      .catch(() => setMessage('No se pudo cargar el calendario.'))
      .finally(() => setBusy(false))
  }, [schoolId])
  const links = useMemo(() => {
    if (!state.calendarUrl) return null
    const encoded = encodeURIComponent(state.calendarUrl)
    return {
      apple: state.calendarUrl.replace(/^https?:\/\//, 'webcal://'),
      google: `https://calendar.google.com/calendar/render?cid=${encoded}`,
    }
  }, [state.calendarUrl])
  async function connect() {
    setBusy(true)
    setMessage(null)
    try {
      setState(
        (await (await postAuthed(`/api/schools/${schoolId}/calendar`)).json()) as CalendarState
      )
      setMessage('Calendario listo para suscribirte.')
    } catch {
      setMessage('No se pudo conectar el calendario.')
    } finally {
      setBusy(false)
    }
  }
  async function disconnect() {
    setBusy(true)
    try {
      await deleteAuthed(`/api/schools/${schoolId}/calendar`)
      setState({ connected: false, calendarUrl: null })
      setMessage('Calendario desconectado.')
    } catch {
      setMessage('No se pudo desconectar.')
    } finally {
      setBusy(false)
    }
  }
  async function copy() {
    if (!state.calendarUrl) return
    try {
      await navigator.clipboard.writeText(state.calendarUrl)
      setMessage('Enlace copiado.')
    } catch {
      setMessage('No se pudo copiar el enlace.')
    }
  }
  return (
    <section className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean-mid)">
          <FiCalendar aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-bold text-(--c-ocean)">Sincronizar calendario</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            Suscríbete desde Apple Calendar o Google Calendar. Los cambios se actualizan desde
            Nadamas.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!state.connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void connect()}
            className="btn btn-primary min-h-11"
          >
            {busy ? 'Cargando…' : 'Generar calendario'}
          </button>
        ) : (
          <>
            {links && (
              <>
                <a href={links.apple} className="btn btn-outline min-h-11 gap-2">
                  <FiExternalLink aria-hidden="true" /> Apple
                </a>
                <a
                  href={links.google}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline min-h-11 gap-2"
                >
                  <FiExternalLink aria-hidden="true" /> Google
                </a>
              </>
            )}
            <button
              type="button"
              onClick={() => void copy()}
              className="btn btn-outline min-h-11 gap-2"
            >
              <FiCopy aria-hidden="true" /> Copiar enlace
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
              className="btn btn-ghost min-h-11"
            >
              Desconectar
            </button>
          </>
        )}
      </div>
      {state.connected && (
        <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-(--c-aqua-strong)">
          <FiCheck aria-hidden="true" /> Suscripción activa
        </p>
      )}
      {message && <p className="mt-3 text-sm text-(--c-text-2)">{message}</p>}
    </section>
  )
}
