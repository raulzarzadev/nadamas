'use client'

import CoachOnboardingBanner from '@comps/coach/CoachOnboardingBanner'
import Link from 'next/link'
import type React from 'react'
import { useEffect, useState } from 'react'
import { FiCalendar, FiChevronRight, FiClock, FiShield, FiUsers } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload } from '@/lib/coach-agenda'

const ACTION_CARDS = [
  {
    href: '/coach/agenda',
    title: 'Mis clases',
    body: 'Clases agendadas, horarios publicados y bloqueos.',
    icon: FiCalendar,
  },
  {
    href: '/coach/students',
    title: 'Alumnos',
    body: 'Tus nadadores y su progreso en un solo lugar.',
    icon: FiUsers,
  },
  {
    href: '/coach/coach-profile',
    title: 'Mi perfil de coach',
    body: 'Especialidades, experiencia y verificación.',
    icon: FiShield,
  },
]

function todayKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export default function CoachHomeDashboard() {
  const { user } = useUser() as {
    user: { nickname?: string; displayName?: string; name?: string } | null
  }
  const [stats, setStats] = useState<{ classes: number; students: number; free: number } | null>(
    null
  )

  useEffect(() => {
    const today = todayKey()
    const month = today.slice(0, 7)
    Promise.all([
      getAuthed(`/api/coach/agenda?month=${month}`).then(
        (r) => r.json() as Promise<CoachAgendaPayload>
      ),
      getAuthed('/api/coach/students').then((r) => r.json() as Promise<{ students?: unknown[] }>),
    ])
      .then(([agenda, studentsPayload]) => {
        const classes = (agenda.bookings || []).filter(
          (booking) => booking.status !== 'cancelled' && booking.date >= today
        ).length
        const free = (agenda.availableSlots || []).filter(
          (slot) => slot.status === 'available' && slot.date >= today
        ).length
        setStats({ classes, students: studentsPayload.students?.length || 0, free })
      })
      .catch(() => setStats({ classes: 0, students: 0, free: 0 }))
  }, [])

  const firstName = (user?.nickname || user?.displayName || user?.name || '').split(' ')[0]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold text-(--c-ocean)">
          Hola{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-(--c-text-2)">Esto es lo que tienes por delante.</p>
      </div>

      <CoachOnboardingBanner />

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<FiCalendar aria-hidden="true" />}
          label="Próximas"
          value={stats?.classes}
        />
        <StatTile icon={<FiUsers aria-hidden="true" />} label="Alumnos" value={stats?.students} />
        <StatTile icon={<FiClock aria-hidden="true" />} label="Horas libres" value={stats?.free} />
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
