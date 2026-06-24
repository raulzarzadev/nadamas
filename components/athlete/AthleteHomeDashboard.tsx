'use client'

import PublicLinkEditor from '@comps/profile/PublicLinkEditor'
import Link from 'next/link'
import type React from 'react'
import { useEffect, useState } from 'react'
import {
  FiCalendar,
  FiChevronRight,
  FiClock,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'

const ACTION_CARDS = [
  {
    href: '/athlete/find-coach',
    title: 'Buscar coach',
    body: 'Encuentra coaches verificados por especialidad y disponibilidad.',
    icon: FiSearch,
  },
  {
    href: '/athlete/bookings',
    title: 'Mis clases',
    body: 'Clases agendadas, estado y datos del coach.',
    icon: FiCalendar,
  },
  {
    href: '/athlete/progress',
    title: 'Mi progreso',
    body: 'Tu historial de clases, distancias y notas del coach.',
    icon: FiTrendingUp,
  },
]

function todayKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function longDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

export default function AthleteHomeDashboard() {
  const { user } = useUser() as {
    user: { nickname?: string; displayName?: string; name?: string } | null
  }
  const [bookings, setBookings] = useState<Booking[] | null>(null)

  useEffect(() => {
    getAuthed('/api/bookings')
      .then((response) => response.json() as Promise<{ bookings?: Booking[] }>)
      .then((payload) => setBookings(payload.bookings || []))
      .catch(() => setBookings([]))
  }, [])

  const today = todayKey()
  const active = (bookings || []).filter((booking) => booking.status !== 'cancelled')
  const upcoming = active
    .filter((booking) => booking.date >= today)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  const nextClass = upcoming[0]
  const coachCount = new Set(active.map((booking) => booking.coachId)).size
  const firstName = (user?.nickname || user?.displayName || user?.name || '').split(' ')[0]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold text-(--c-ocean)">
          Hola{firstName ? `, ${firstName}` : ', nadador'}
        </h1>
        <p className="mt-1 text-(--c-text-2)">Listo para tu próxima clase.</p>
      </div>

      {nextClass ? (
        <Link
          href="/athlete/bookings"
          className="flex items-center gap-4 rounded-[var(--r-md)] border border-(--c-aqua-light) bg-gradient-to-br from-(--c-aqua-light)/40 to-white p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-(--c-aqua) to-(--c-ocean) text-white">
            <FiClock aria-hidden="true" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wide text-(--c-aqua-strong)">
              Tu próxima clase
            </span>
            <span className="block truncate font-bold text-(--c-ocean)">
              {nextClass.coachName || 'Tu coach'}
            </span>
            <span className="block text-sm capitalize text-(--c-text-2)">
              {longDate(nextClass.date)} · {nextClass.startTime}
            </span>
          </span>
          <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
        </Link>
      ) : (
        <Link
          href="/athlete/find-coach"
          className="flex items-center gap-4 rounded-[var(--r-md)] border border-dashed border-(--c-border) bg-(--c-surface) p-5 transition-colors hover:bg-white"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-(--c-aqua-strong) shadow-[var(--shadow-sm)]">
            <FiSearch aria-hidden="true" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-(--c-ocean)">Reserva tu primera clase</span>
            <span className="block text-sm text-(--c-text-2)">
              Encuentra un coach y agenda tu primer entrenamiento.
            </span>
          </span>
          <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
        </Link>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<FiCalendar aria-hidden="true" />}
          label="Próximas"
          value={bookings === null ? undefined : upcoming.length}
        />
        <StatTile
          icon={<FiTrendingUp aria-hidden="true" />}
          label="Clases"
          value={bookings === null ? undefined : active.length}
        />
        <StatTile
          icon={<FiUsers aria-hidden="true" />}
          label="Coaches"
          value={bookings === null ? undefined : coachCount}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACTION_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex items-start gap-3 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean-mid)">
                <Icon aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-bold text-(--c-ocean)">
                  {card.title}
                  <FiChevronRight
                    aria-hidden="true"
                    className="text-(--c-text-2) transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="mt-1 block text-sm text-(--c-text-2)">{card.body}</span>
              </span>
            </Link>
          )
        })}
      </div>

      <PublicLinkEditor />
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | undefined
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--r-md)] border border-(--c-border) bg-white p-4 shadow-[var(--shadow-sm)]">
      <span className="text-(--c-ocean-mid)">{icon}</span>
      <span className="text-2xl font-extrabold leading-none text-(--c-ocean)">
        {value === undefined ? '—' : value}
      </span>
      <span className="text-xs font-semibold text-(--c-text-2)">{label}</span>
    </div>
  )
}
