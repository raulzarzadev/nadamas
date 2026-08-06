'use client'

import { type ReactNode, useEffect, useState } from 'react'
import {
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiCopy,
  FiLink,
  FiMessageCircle,
  FiShare2,
  FiX,
} from 'react-icons/fi'
import CalendarConnectionCard from '@/components/calendar/CalendarConnectionCard'
import Sheet from '@/components/ui/sheet'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'
import { useCoachAgendaShare } from './CoachAgendaShareContext'

type Feedback = 'link' | 'schedule' | 'error' | null

export default function ShareScheduleButton() {
  const { user } = useUser()
  const { scheduleText } = useCoachAgendaShare()
  const [open, setOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [coachSlug, setCoachSlug] = useState<string | null>(null)

  const uid = user?.uid || user?.id

  useEffect(() => {
    if (!uid) return
    let active = true
    getAuthed('/api/slug?self=1')
      .then((response) => response.json())
      .then((data: { slugs?: { coach?: string } }) => {
        if (active && data.slugs?.coach) setCoachSlug(data.slugs.coach)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [uid])

  async function copy(value: string, success: Exclude<Feedback, 'error' | null>) {
    setFeedback(null)
    try {
      await copyTextToClipboard(value)
      setFeedback(success)
      setTimeout(() => setFeedback(null), 2200)
    } catch {
      setFeedback('error')
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  function closeModal() {
    setOpen(false)
    setCalendarOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!uid}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[var(--c-aqua)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FiShare2 aria-hidden="true" /> Compartir
      </button>

      <Sheet open={open} onClose={closeModal} label="Compartir agenda" keyboardAware>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--c-ocean)]">Compartir agenda</h2>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">
                Elige cómo quieres compartir o sincronizar tus horarios.
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Cerrar"
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--c-text-2)] transition-colors hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <ShareOption
              icon={<FiLink aria-hidden="true" />}
              title={feedback === 'link' ? 'Enlace copiado' : 'Copiar enlace de agenda del coach'}
              description="Comparte tu perfil público y agenda con alumnos."
              success={feedback === 'link'}
              onClick={() => {
                if (uid) void copy(`${window.location.origin}/${coachSlug || uid}`, 'link')
              }}
              disabled={!uid}
            />
            <ShareOption
              icon={<FiMessageCircle aria-hidden="true" />}
              title={feedback === 'schedule' ? 'Horarios copiados' : 'Copiar horarios en texto'}
              description={
                scheduleText
                  ? 'Copia la semana visible en un formato listo para WhatsApp.'
                  : 'No hay horarios disponibles en la semana visible.'
              }
              success={feedback === 'schedule'}
              onClick={() => void copy(scheduleText, 'schedule')}
              disabled={!scheduleText}
            />
            <div className="overflow-hidden rounded-[var(--r-sm)] border border-[var(--c-border)]">
              <button
                type="button"
                aria-expanded={calendarOpen}
                aria-controls="share-calendar-options"
                onClick={() => setCalendarOpen((current) => !current)}
                className="group flex min-h-16 w-full cursor-pointer items-center gap-3 bg-white p-3 text-left transition-colors hover:bg-[var(--c-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--c-aqua-strong)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--c-aqua-light)] text-[var(--c-aqua-strong)]">
                  <FiCalendar aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[var(--c-ocean)]">
                    Ligar calendario
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--c-text-2)]">
                    Sincroniza tus clases con Google, Apple u Outlook.
                  </span>
                </span>
                <FiChevronRight
                  aria-hidden="true"
                  className={`shrink-0 text-[var(--c-text-2)] transition-transform ${
                    calendarOpen ? 'rotate-90' : 'group-hover:translate-x-0.5'
                  }`}
                />
              </button>
              {calendarOpen && (
                <div
                  id="share-calendar-options"
                  className="border-t border-[var(--c-border)] bg-[var(--c-bg)] p-2"
                >
                  <CalendarConnectionCard calendarRole="coach" embedded />
                </div>
              )}
            </div>
          </div>

          {feedback === 'error' && (
            <p className="text-sm font-semibold text-[var(--rose-tx)]" role="status">
              No se pudo copiar. Inténtalo de nuevo.
            </p>
          )}
        </div>
      </Sheet>
    </>
  )
}

function ShareOption({
  icon,
  title,
  description,
  success,
  onClick,
  disabled,
}: {
  icon: ReactNode
  title: string
  description: string
  success: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white p-3 text-left transition-colors hover:border-[var(--c-aqua)] hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
          success
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-[var(--c-aqua-light)] text-[var(--c-aqua-strong)]'
        }`}
      >
        {success ? <FiCheck aria-hidden="true" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--c-ocean)]">{title}</span>
        <span className="mt-0.5 block text-xs text-[var(--c-text-2)]">{description}</span>
      </span>
      <FiCopy
        aria-hidden="true"
        className="shrink-0 text-[var(--c-text-2)] transition-colors group-hover:text-[var(--c-aqua-strong)]"
      />
    </button>
  )
}
