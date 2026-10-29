'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FiCalendar, FiCheck, FiCopy, FiExternalLink, FiTrash2 } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
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

  const [sheetOpen, setSheetOpen] = useState(false)
  const autoCreated = useRef(false)
  // Embedded (already inside a sheet/panel) shows the options right away; the private link is
  // created on first view so the calendar links are ready to tap.
  const optionsVisible = embedded || sheetOpen
  // biome-ignore lint/correctness/useExhaustiveDependencies: create the link once when options open.
  useEffect(() => {
    if (!optionsVisible || status !== 'idle' || connection.connected || autoCreated.current) return
    // Only once: after "Desligar" the link stays off until the user opens this again.
    autoCreated.current = true
    void save()
  }, [optionsVisible, status])

  const busy = status === 'loading' || status === 'saving'
  const hint =
    calendarRole === 'coach'
      ? 'Tus clases con alumnos se mostrarán en tu app de calendario favorita.'
      : 'Tus clases agendadas se mostrarán en tu app de calendario favorita.'
  const chipClass = (selected: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-bold transition disabled:opacity-60 ${
      selected
        ? 'border-(--c-aqua) bg-(--c-aqua-light) text-(--c-ocean)'
        : 'border-(--c-border) bg-white text-(--c-text-2) hover:bg-(--c-surface)'
    }`
  const linkClass =
    'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-4 py-2.5 text-sm font-bold text-(--c-ocean) transition-colors hover:bg-(--c-surface) disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]'

  const options = (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
          Agrégalo a tu calendario
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {links ? (
            <>
              {isAppleCalendarPlatform && (
                <a href={links.apple} className={linkClass}>
                  Apple
                  <FiExternalLink aria-hidden="true" />
                </a>
              )}
              <a href={links.google} target="_blank" rel="noreferrer" className={linkClass}>
                Google
                <FiExternalLink aria-hidden="true" />
              </a>
              <a href={links.outlook} target="_blank" rel="noreferrer" className={linkClass}>
                Outlook
                <FiExternalLink aria-hidden="true" />
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={() => void copyLink()}
                className={linkClass}
              >
                <FiCopy aria-hidden="true" />
                Copiar link
              </button>
            </>
          ) : (
            status !== 'error' && (
              <output className="text-sm text-(--c-text-2)">Preparando tu calendario…</output>
            )
          )}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-(--c-text-2)">Recordatorios</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REMINDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={busy}
              onClick={() => toggleOffset(option.value)}
              className={chipClass(selectedOffsets.includes(option.value))}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSelectedOffsets([])
              if (connection.connected) void save([])
            }}
            className={chipClass(selectedOffsets.length === 0)}
          >
            Ninguno
          </button>
        </div>
      </div>
      {message && (
        <p
          role="status"
          className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-(--c-text-2)'}`}
        >
          {message}
        </p>
      )}
      {connection.connected && (
        <div className="grid gap-3 border-t border-(--c-border) pt-4">
          <p className="text-xs text-(--c-text-2)">
            Tu enlace es privado: quien lo tenga podrá ver tus clases. Tu app de calendario lo
            actualiza sola y puede tardar unas horas.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            aria-label="Desligar calendario"
            className="inline-flex min-h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-[var(--r-sm)] border border-(--rose-bd) bg-white px-4 py-2.5 text-sm font-bold text-(--rose-tx) transition hover:bg-(--rose-bg) disabled:opacity-60"
          >
            <FiTrash2 aria-hidden="true" />
            Desligar
          </button>
        </div>
      )}
    </div>
  )

  if (embedded) return options

  return (
    <section
      id="calendar"
      aria-label="Calendario"
      className="scroll-mt-24 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]"
    >
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          autoCreated.current = false
          setSheetOpen(true)
        }}
        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-(--c-ocean) px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
      >
        {connection.connected ? <FiCheck aria-hidden="true" /> : <FiCalendar aria-hidden="true" />}
        Suscribirme al calendario
      </button>
      <p className="mt-2 text-center text-xs text-(--c-text-2)">{hint}</p>
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        label="Suscribirme al calendario"
        size="lg"
      >
        {options}
      </Sheet>
    </section>
  )
}
