'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiCheck, FiCopy, FiExternalLink, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'

type CalendarRole = 'athlete' | 'coach'
type ReminderOffset = 5 | 60 | 1440
type Status = 'idle' | 'loading' | 'saving' | 'error'

interface CalendarConnection {
  connected: boolean
  role: CalendarRole | null
  reminderOffsets: ReminderOffset[]
  calendarUrl: string | null
  updatedAt: number | null
}

const REMINDER_OPTIONS: { value: ReminderOffset; label: string }[] = [
  { value: 1440, label: '1 día' },
  { value: 60, label: '1 hora' },
  { value: 5, label: '5 min' },
]

const EMPTY_CONNECTION: CalendarConnection = {
  connected: false,
  role: null,
  reminderOffsets: [],
  calendarUrl: null,
  updatedAt: null,
}

function webcalUrl(url: string) {
  return url.replace(/^https?:\/\//, 'webcal://')
}

export default function CalendarConnectionCard({
  calendarRole,
  embedded = false,
}: {
  calendarRole: CalendarRole
  embedded?: boolean
}) {
  const [connection, setConnection] = useState<CalendarConnection>(EMPTY_CONNECTION)
  const [selectedOffsets, setSelectedOffsets] = useState<ReminderOffset[]>([1440, 60, 5])
  const [isAppleCalendarPlatform, setIsAppleCalendarPlatform] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const userAgent = navigator.userAgent || ''
    const platform = navigator.platform || ''
    const appleMobile = /iPad|iPhone|iPod/.test(userAgent)
    const appleDesktop = /Mac/.test(platform) && !/Android|Windows|Linux/.test(userAgent)
    setIsAppleCalendarPlatform(appleMobile || appleDesktop)
  }, [])

  useEffect(() => {
    let active = true
    setStatus('loading')
    getAuthed(`/api/calendar/connection?role=${calendarRole}`)
      .then((response) => response.json() as Promise<CalendarConnection>)
      .then((payload) => {
        if (!active) return
        setConnection(payload)
        setSelectedOffsets(payload.reminderOffsets.length ? payload.reminderOffsets : [])
        setStatus('idle')
      })
      .catch(() => {
        if (!active) return
        setStatus('error')
        setMessage('No se pudo cargar tu calendario.')
      })
    return () => {
      active = false
    }
  }, [calendarRole])

  const links = useMemo(() => {
    if (!connection.calendarUrl) return null
    const encodedUrl = encodeURIComponent(connection.calendarUrl)
    const encodedName = encodeURIComponent(
      calendarRole === 'coach' ? 'Nadamas - Clases con alumnos' : 'Nadamas - Mis clases'
    )
    return {
      apple: webcalUrl(connection.calendarUrl),
      google: `https://calendar.google.com/calendar/render?cid=${encodedUrl}`,
      outlook: `https://outlook.live.com/calendar/0/addcalendar?url=${encodedUrl}&name=${encodedName}`,
    }
  }, [connection.calendarUrl, calendarRole])

  async function save(nextOffsets = selectedOffsets) {
    setStatus('saving')
    setMessage(null)
    try {
      const response = await postAuthed('/api/calendar/connection', {
        role: calendarRole,
        reminderOffsets: nextOffsets,
      })
      const payload = (await response.json()) as CalendarConnection
      setConnection(payload)
      setSelectedOffsets(payload.reminderOffsets)
      setStatus('idle')
      setMessage('Calendario actualizado.')
    } catch {
      setStatus('error')
      setMessage('No se pudo actualizar. Intenta de nuevo.')
    }
  }

  async function disconnect() {
    setStatus('saving')
    setMessage(null)
    try {
      await deleteAuthed(`/api/calendar/connection?role=${calendarRole}`)
      setConnection(EMPTY_CONNECTION)
      setStatus('idle')
      setMessage('Calendario desligado.')
    } catch {
      setStatus('error')
      setMessage('No se pudo desligar. Intenta de nuevo.')
    }
  }

  function toggleOffset(offset: ReminderOffset) {
    const next = selectedOffsets.includes(offset)
      ? selectedOffsets.filter((item) => item !== offset)
      : [...selectedOffsets, offset].sort((a, b) => b - a)
    setSelectedOffsets(next)
    if (connection.connected) void save(next)
  }

  async function copyLink() {
    if (!connection.calendarUrl) return
    try {
      await copyTextToClipboard(connection.calendarUrl)
      setMessage('Link copiado.')
    } catch {
      setMessage('No se pudo copiar el link.')
    }
  }

  const busy = status === 'loading' || status === 'saving'
  const title =
    calendarRole === 'coach' ? 'Calendario de clases con alumnos' : 'Calendario de mis clases'
  const body =
    calendarRole === 'coach'
      ? 'Sincroniza solo tus clases reales con alumnos asignados.'
      : 'Sincroniza tus próximas clases con tus calendarios.'

  return (
    <section
      id={embedded ? undefined : 'calendar'}
      className={`rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 ${
        embedded ? 'shadow-none' : 'scroll-mt-24 shadow-[var(--shadow-sm)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean-mid)">
          <FiCalendar aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-(--c-ocean)">{title}</h2>
            {connection.connected && (
              <span className="inline-flex items-center gap-1 rounded-full border border-(--c-border) bg-(--c-surface) px-2 py-0.5 text-xs font-bold text-(--c-aqua-strong)">
                <FiCheck aria-hidden="true" size={12} />
                Ligado
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-(--c-text-2)">{body}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-(--c-text-2)">Recordatorios</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REMINDER_OPTIONS.map((option) => {
            const selected = selectedOffsets.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                disabled={busy}
                onClick={() => toggleOffset(option.value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold transition disabled:opacity-60 ${
                  selected
                    ? 'border-(--c-aqua) bg-(--c-aqua-light) text-(--c-ocean)'
                    : 'border-(--c-border) bg-white text-(--c-text-2) hover:bg-(--c-surface)'
                }`}
              >
                {option.label}
              </button>
            )
          })}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSelectedOffsets([])
              if (connection.connected) void save([])
            }}
            className={`rounded-full border px-3 py-1.5 text-sm font-bold transition disabled:opacity-60 ${
              selectedOffsets.length === 0
                ? 'border-(--c-aqua) bg-(--c-aqua-light) text-(--c-ocean)'
                : 'border-(--c-border) bg-white text-(--c-text-2) hover:bg-(--c-surface)'
            }`}
          >
            Ninguno
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!connection.connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-(--c-ocean) px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            <FiCalendar aria-hidden="true" />
            Ligar calendario
          </button>
        ) : (
          <>
            {links && (
              <>
                {isAppleCalendarPlatform ? (
                  <a
                    href={links.apple}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-(--c-ocean) px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    Apple / iOS
                    <FiExternalLink aria-hidden="true" />
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--r-sm)] border border-(--c-border) bg-(--c-surface) px-4 py-2.5 text-sm font-bold text-(--c-text-2) opacity-70"
                  >
                    Apple / iOS no disponible
                  </button>
                )}
                <a
                  href={links.google}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-4 py-2.5 text-sm font-bold text-(--c-ocean) transition hover:bg-(--c-surface)"
                >
                  Google
                  <FiExternalLink aria-hidden="true" />
                </a>
                <a
                  href={links.outlook}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-4 py-2.5 text-sm font-bold text-(--c-ocean) transition hover:bg-(--c-surface)"
                >
                  Outlook
                  <FiExternalLink aria-hidden="true" />
                </a>
              </>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void copyLink()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-4 py-2.5 text-sm font-bold text-(--c-ocean) transition hover:bg-(--c-surface) disabled:opacity-60"
            >
              <FiCopy aria-hidden="true" />
              Copiar link
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              aria-label="Actualizar calendario"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-4 py-2.5 text-sm font-bold text-(--c-ocean) transition hover:bg-(--c-surface) disabled:opacity-60"
            >
              <FiRefreshCw aria-hidden="true" />
              Actualizar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
              aria-label="Desligar calendario"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-(--rose-bd) bg-white px-4 py-2.5 text-sm font-bold text-(--rose-tx) transition hover:bg-(--rose-bg) disabled:opacity-60"
            >
              <FiTrash2 aria-hidden="true" />
              Desligar
            </button>
          </>
        )}
      </div>

      {message && (
        <p className={`mt-3 text-sm ${status === 'error' ? 'text-red-600' : 'text-(--c-text-2)'}`}>
          {message}
        </p>
      )}
    </section>
  )
}
