'use client'
import Loading from '@comps/Loading'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AgendaOpenHoursModal, { type AgendaWeekDay } from '@/components/coach/AgendaOpenHoursModal'
import OfferingSummaryCard from '@/components/coach/OfferingSummaryCard'
import { useUser } from '@/context/UserContext'
import type { CoachClassOffering, CoachPrivate, CoachPublic } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { coachMissingItems } from '@/lib/coach-completeness'
import { resolveOfferings } from '@/lib/coach-offerings'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildNextWeekDays(): AgendaWeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return {
      key: dateKey(date),
      label: `${DAY_LABELS[date.getDay()]} ${date.getDate()}`,
    }
  })
}

function addOneHour(time: string) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const nextHour = Math.min(hour + 1, 23)
  return `${String(nextHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function dayLabelsFromDates(dates: string[]) {
  return [
    ...new Set(
      dates.map((date) => {
        const parsed = new Date(`${date}T12:00:00`)
        return DAY_LABELS[parsed.getDay()]
      })
    ),
  ]
}

/**
 * Blocks coach-only tools (alumnos, agenda) until the coach profile is
 * complete. The profile page itself must NOT use this.
 */
export default function CoachProfileGate({
  children,
  showIncompleteNotice = true,
  renderChildrenWhenIncomplete = false,
  showScheduleSetup = false,
}: {
  children: React.ReactNode
  showIncompleteNotice?: boolean
  renderChildrenWhenIncomplete?: boolean
  showScheduleSetup?: boolean
}) {
  const { user } = useUser() as {
    user: { uid?: string; id?: string; firstName?: string; lastName?: string } | null
  }
  const uid = user?.uid || user?.id
  const [pub, setPub] = useState<CoachPublic | null | undefined>(undefined)
  const [priv, setPriv] = useState<CoachPrivate | null | undefined>(undefined)
  const [showOpenHoursModal, setShowOpenHoursModal] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return
    const u1 = CoachCRUD.listenPublic(uid, setPub)
    const u2 = CoachCRUD.listenPrivate(uid, setPriv)
    return () => {
      u1?.()
      u2?.()
    }
  }, [uid])

  if (!uid || pub === undefined || priv === undefined) return <Loading />

  const missing = coachMissingItems({
    pub,
    priv,
    firstName: user?.firstName,
    lastName: user?.lastName,
  })

  if (missing.length === 0) return <>{children}</>

  const offerings = resolveOfferings(pub || {})
  const showScheduleInput = showScheduleSetup || missing.includes('Lugar y horarios')
  const weekDays = buildNextWeekDays()

  async function saveOpenHours(dates: string[], times: string[]) {
    if (!uid || dates.length === 0 || times.length === 0) return

    setSavingSchedule(true)
    setScheduleMessage(null)

    const offering: CoachClassOffering = {
      id: crypto.randomUUID(),
      mode: 'fixed',
      placeName: '',
      locationUrl: '',
      coverageArea: '',
      onlineDetails: '',
      groupType: 'particular',
      maxPeople: null,
      schedules: times.map((time) => ({
        id: crypto.randomUUID(),
        timeMode: 'fixed',
        days: dayLabelsFromDates(dates),
        startTime: time,
        endTime: addOneHour(time),
        availabilityMode: 'always',
        availableDates: dates,
      })),
      durationMinutes: 60,
      priceCents: null,
      currency: 'MXN',
      unit: 'clase',
      details: '',
    }

    try {
      await CoachCRUD.upsertPublic(uid, {
        classOfferings: [...(pub?.classOfferings || []), offering],
      })
      setScheduleMessage('Horario guardado.')
      setShowOpenHoursModal(false)
    } catch (_error) {
      setScheduleMessage('Ups, algo salió mal. Inténtalo de nuevo más tarde.')
    } finally {
      setSavingSchedule(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showIncompleteNotice && (
        <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <h1 className="text-2xl font-extrabold">Completa tu perfil primero</h1>
          <p className="mt-2 text-[var(--c-text-2)]">
            Para usar esta sección necesitas terminar tu perfil de coach. Te
            {missing.length === 1 ? ' falta' : ' faltan'} {missing.length}{' '}
            {missing.length === 1 ? 'cosa' : 'cosas'}:
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {missing.map((item) => (
              <li
                key={item}
                className="rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm text-[var(--c-text-2)]"
              >
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/coach/coach-profile"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--c-aqua)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)]"
          >
            Ir a mi perfil de coach
          </Link>
        </div>
      )}

      {renderChildrenWhenIncomplete && children}

      {offerings.length > 0 && (
        <section
          aria-labelledby="configured-schedules-title"
          className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8"
        >
          <div className="flex flex-col gap-2">
            <h2
              id="configured-schedules-title"
              className="text-xl font-extrabold text-[var(--c-ocean)]"
            >
              Horarios configurados
            </h2>
            <p className="text-sm text-[var(--c-text-2)]">
              Estos horarios ya cuentan para tu perfil. Completa lo demás para entrar a tu agenda.
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {offerings.map((offering) => (
              <OfferingSummaryCard key={offering.id} offering={offering} className="h-full" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
