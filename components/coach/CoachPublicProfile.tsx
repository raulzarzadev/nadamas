'use client'

import CopyLinkButton from '@comps/coach/CopyLinkButton'
import Icon from '@comps/Icon'
import { TextField } from '@comps/Inputs/FormFields'
import Avatar from '@comps/ui/avatar'
import Sheet from '@comps/ui/sheet'
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiCheck, FiCopy } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { auth, googleLogin } from '@/firebase/index'
import { loginUser } from '@/firebase/users'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'
import {
  bookingSelectionKey,
  type CoachBookingSelection,
  flattenCoachBookingSelections,
  type PublicBlockedSlot,
  type PublicBookedSlot,
} from '@/lib/coach-booking'
import {
  addDays,
  dateKey,
  formatPesos,
  offeringContextLabel,
  offeringTypeLabel,
  resolveOfferingSchedules,
  resolveOfferings,
  scheduleIsOpen,
} from '@/lib/coach-offerings'
import { coachDisplayPhoto } from '@/lib/coach-photo'
import { DAY_LABELS, formatWhatsappScheduleText } from '@/lib/coach-whatsapp-schedule'
import CoachScheduleRows from './CoachScheduleRows'
import VerifiedBadge from './VerifiedBadge'

interface CurrentUser {
  nickname?: string
  displayName?: string
  name?: string
  email?: string
}

interface OptionalUserContext {
  user: CurrentUser | null | undefined
  refreshUser?: () => Promise<unknown>
}

function publicBookedSlotKey(
  slot: Pick<PublicBookedSlot, 'offeringId' | 'scheduleId' | 'date' | 'startTime' | 'endTime'>
) {
  return [slot.offeringId, slot.scheduleId, slot.date, slot.startTime, slot.endTime].join('::')
}

function buildBookedSlotMap(bookedSlots: PublicBookedSlot[]) {
  return new Map(bookedSlots.map((slot) => [publicBookedSlotKey(slot), slot.bookedCount]))
}

function selectionCapacity(
  coach: CoachPublic,
  selection: Pick<CoachBookingSelection, 'offeringId'>
) {
  const offering = resolveOfferings(coach).find((item) => item.id === selection.offeringId)
  if (offering?.groupType === 'grupal') return Math.max(1, offering.maxPeople || 1)
  return 1
}

function isSelectionFull(
  coach: CoachPublic,
  selection: CoachBookingSelection,
  bookedSlotCounts: Map<string, number>
) {
  const bookedCount = bookedSlotCounts.get(publicBookedSlotKey(selection)) || 0
  return bookedCount >= selectionCapacity(coach, selection)
}

function groupSelectionsByDay(selections: CoachBookingSelection[]) {
  const groups = new Map<string, CoachBookingSelection[]>()

  for (const selection of selections) {
    groups.set(selection.date, [...(groups.get(selection.date) || []), selection])
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySelections]) => ({
      date,
      day: daySelections[0]?.days[0] || '',
      selections: daySelections.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }))
}

function selectedTotalLabel(selections: CoachBookingSelection[]) {
  const knownTotal = selections.reduce((total, selection) => total + (selection.priceCents || 0), 0)
  const hasUnknownPrice = selections.some((selection) => selection.priceCents === null)

  if (hasUnknownPrice && knownTotal > 0) return `${formatPesos(knownTotal)} + precio por definir`
  if (hasUnknownPrice) return 'Precio por definir'
  return formatPesos(knownTotal)
}

function selectedDetailLabel(selection: CoachBookingSelection) {
  const date = new Date(`${selection.date}T12:00:00`)
  const day = selection.days[0] || ''
  const dateLabel = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return `${DAY_LABELS[day] || day} ${dateLabel} · ${selection.startTime}`
}

function sortSelectedSelections(selections: CoachBookingSelection[]) {
  return [...selections].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  )
}

function selectedCountLabel(count: number) {
  return count === 1 ? '1 clase seleccionada' : `${count} clases seleccionadas`
}

function hasSelectionPassed(selection: Pick<CoachBookingSelection, 'date' | 'startTime'>) {
  return new Date(`${selection.date}T${selection.startTime}:00`).getTime() <= Date.now()
}

function todayStart() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function whatsappUrl(coach: CoachPublic, message: string) {
  const link = coach.publicLinks?.find((item) => item.kind === 'whatsapp')
  if (!link?.value) return null
  const phone = link.value.replace(/\D/g, '')
  if (!phone) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export default function CoachPublicProfile({
  coach,
  name,
  avatarUrl,
  bookedSlots = [],
  blockedSlots = [],
}: {
  coach: CoachPublic
  name?: string
  avatarUrl?: string | null
  bookedSlots?: PublicBookedSlot[]
  blockedSlots?: PublicBlockedSlot[]
}) {
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingStep, setBookingStep] = useState<'details' | 'otp' | 'done'>('details')
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [bookingMessage, setBookingMessage] = useState<string | null>(null)
  const [bookingName, setBookingName] = useState('')
  const [bookingEmail, setBookingEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  const [periodStart, setPeriodStart] = useState(() => todayStart())
  const [whatsappCopied, setWhatsappCopied] = useState(false)
  const [whatsappCopyFailed, setWhatsappCopyFailed] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<Record<string, CoachBookingSelection>>({})
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser)
  const currentPeriodStart = useMemo(() => todayStart(), [])
  const userContext = useUser() as OptionalUserContext | undefined
  const user =
    userContext?.user ??
    (firebaseUser
      ? {
          displayName: firebaseUser.displayName || undefined,
          email: firebaseUser.email || undefined,
        }
      : null)
  const refreshUser = userContext?.refreshUser
  const verified = coach.verification?.status === 'verified'
  const heroPhoto = coachDisplayPhoto(coach, avatarUrl)
  const offerings = resolveOfferings(coach)
  const openOfferings = offerings.filter((offering) =>
    resolveOfferingSchedules(offering).some(scheduleIsOpen)
  )
  const bookingSelections = useMemo(
    () =>
      coach.id
        ? flattenCoachBookingSelections({ ...coach, id: coach.id }, periodStart)
        : ([] as CoachBookingSelection[]),
    [coach, periodStart]
  )
  // Hours the coach blocked — shown struck-through (not bookable) on the public
  // schedule. Whole-day blocks cover every hour of that date.
  const blockedLookup = useMemo(() => {
    const allDays = new Set(blockedSlots.filter((b) => b.allDay).map((b) => b.date))
    const allHours = new Set(
      blockedSlots.filter((b) => !b.allDay && b.startTime).map((b) => `${b.date}|${b.startTime}`)
    )
    return { allDays, allHours }
  }, [blockedSlots])
  const isBlocked = useCallback(
    (selection: CoachBookingSelection) =>
      blockedLookup.allDays.has(selection.date) ||
      blockedLookup.allHours.has(`${selection.date}|${selection.startTime}`),
    [blockedLookup]
  )
  const bookedSlotCounts = useMemo(() => buildBookedSlotMap(bookedSlots), [bookedSlots])
  // Any booking at a given date+hour marks it occupied — coach-added bookings use
  // a synthetic offeringId ('open') that won't match the offering selection key,
  // so match by time instead of relying solely on per-offering capacity.
  const bookedHours = useMemo(
    () => new Set(bookedSlots.map((slot) => `${slot.date}|${slot.startTime}`)),
    [bookedSlots]
  )
  const sortedAllSelectedSelections = useMemo(
    () => sortSelectedSelections(Object.values(selectedSlots)),
    [selectedSlots]
  )
  const selectedCount = sortedAllSelectedSelections.length
  const selectedTotal = selectedTotalLabel(sortedAllSelectedSelections)
  const selectedKeys = useMemo(() => new Set(Object.keys(selectedSlots)), [selectedSlots])
  const canGoPreviousPeriod = periodStart > currentPeriodStart

  const isBookableSelection = useCallback(
    (selection: CoachBookingSelection) =>
      !isSelectionFull(coach, selection, bookedSlotCounts) &&
      !bookedHours.has(`${selection.date}|${selection.startTime}`) &&
      !isBlocked(selection) &&
      !hasSelectionPassed(selection),
    [coach, bookedSlotCounts, bookedHours, isBlocked]
  )

  const firstBookableDate = useMemo(() => {
    if (!coach.id) return currentPeriodStart

    const selections = flattenCoachBookingSelections(
      { ...coach, id: coach.id },
      currentPeriodStart,
      56
    )
    const first = sortSelectedSelections(selections).find(isBookableSelection)
    return first ? new Date(`${first.date}T00:00:00`) : currentPeriodStart
  }, [coach, currentPeriodStart, isBookableSelection])

  const dayRows = useMemo(
    () =>
      groupSelectionsByDay(bookingSelections)
        .map((group) => ({
          key: group.date,
          dayLabel: DAY_LABELS[group.day] || group.day,
          dateLabel: new Date(`${group.date}T12:00:00`).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
          }),
          times: group.selections.map((selection) => {
            const key = bookingSelectionKey(selection)
            const occupied =
              isSelectionFull(coach, selection, bookedSlotCounts) ||
              bookedHours.has(`${selection.date}|${selection.startTime}`)
            const blocked = isBlocked(selection)
            const passed = hasSelectionPassed(selection)
            const disabled = occupied || blocked || passed
            return {
              key,
              label: selection.startTime,
              active: selectedKeys.has(key),
              disabled,
              ariaLabel: `${DAY_LABELS[group.day] || group.day} ${selection.startTime}${
                passed
                  ? ', horario ya pasó'
                  : blocked
                    ? ', horario no disponible'
                    : occupied
                      ? ', horario lleno'
                      : ''
              }`,
              onClick: disabled
                ? undefined
                : () =>
                    setSelectedSlots((current) => {
                      if (!current[key]) return { ...current, [key]: selection }
                      const next = { ...current }
                      delete next[key]
                      return next
                    }),
            }
          }),
        }))
        .filter((day) => day.times.some((time) => !time.disabled)),
    [bookingSelections, coach, bookedSlotCounts, bookedHours, isBlocked, selectedKeys]
  )
  const whatsappDayRows = useMemo(
    () =>
      groupSelectionsByDay(bookingSelections)
        .map((group) => ({
          key: group.date,
          dayKey: group.day,
          dayLabel: DAY_LABELS[group.day] || group.day,
          times: group.selections.map((selection) => {
            const occupied =
              isSelectionFull(coach, selection, bookedSlotCounts) ||
              bookedHours.has(`${selection.date}|${selection.startTime}`)
            const disabled = occupied || isBlocked(selection) || hasSelectionPassed(selection)

            return {
              key: bookingSelectionKey(selection),
              label: `${selection.startTime} - ${selection.endTime}`,
              disabled,
              groupType: selection.groupType,
            }
          }),
        }))
        .filter((day) => day.times.length > 0),
    [bookingSelections, coach, bookedSlotCounts, bookedHours, isBlocked]
  )
  const whatsappScheduleText = useMemo(() => {
    return formatWhatsappScheduleText(whatsappDayRows, periodStart)
  }, [whatsappDayRows, periodStart])
  const canCopyWhatsappSchedule = whatsappScheduleText.length > 0

  useEffect(() => onAuthStateChanged(auth, setFirebaseUser), [])

  useEffect(() => {
    setPeriodStart((current) => {
      if (dateKey(current) !== dateKey(currentPeriodStart)) return current
      return firstBookableDate
    })
  }, [currentPeriodStart, firstBookableDate])

  const loggedBookingName = (
    user?.nickname ||
    user?.displayName ||
    user?.name ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split('@')[0] ||
    ''
  ).trim()
  const loggedBookingEmail = (user?.email || auth.currentUser?.email || '').trim()

  async function createBookings(selections: CoachBookingSelection[], bookerName: string) {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('auth_required')

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        selections,
        athleteProfile: { name: bookerName },
      }),
    })

    if (!response.ok) throw new Error('booking_failed')
    return response.json()
  }

  async function confirmLoggedBooking() {
    const bookerName = loggedBookingName
    if (!bookerName) {
      setBookingStatus('error')
      setBookingMessage(
        'No encontramos tu nombre en la sesión. Actualiza tu perfil e intenta otra vez.'
      )
      return
    }

    setBookingStatus('loading')
    setBookingMessage(null)
    try {
      await createBookings(sortedAllSelectedSelections, bookerName)
      await refreshUser?.()
      setBookingStep('done')
      setSelectedSlots({})
    } catch {
      setBookingStatus('error')
      setBookingMessage('Ups, algo salió mal. Inténtalo de nuevo más tarde.')
    } finally {
      setBookingStatus('idle')
    }
  }

  async function requestOtp() {
    const trimmedName = bookingName.trim()
    const email = bookingEmail.trim().toLowerCase()
    if (!trimmedName || !email) {
      setBookingStatus('error')
      setBookingMessage('Escribe tu nombre y correo para continuar.')
      return
    }

    setBookingStatus('loading')
    setBookingMessage(null)
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          pendingBooking: { selections: sortedAllSelectedSelections, athleteName: trimmedName },
        }),
      })
      if (!response.ok) throw new Error('otp_request_failed')
      setBookingStep('otp')
      setBookingMessage('Te enviamos un correo con un botón para entrar y un código.')
    } catch {
      setBookingStatus('error')
      setBookingMessage('Ups, algo salió mal. Inténtalo de nuevo más tarde.')
    } finally {
      setBookingStatus('idle')
    }
  }

  async function verifyOtpAndBook() {
    const trimmedName = bookingName.trim()
    const email = bookingEmail.trim().toLowerCase()
    const code = otpCode.trim()
    if (!code) {
      setBookingStatus('error')
      setBookingMessage('Escribe el código que enviamos a tu correo.')
      return
    }

    setBookingStatus('loading')
    setBookingMessage(null)
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      if (!response.ok) throw new Error('otp_verify_failed')
      const payload = (await response.json()) as {
        customToken?: string
        bookingCompleted?: boolean
      }
      if (!payload.customToken) throw new Error('missing_token')
      await signInWithCustomToken(auth, payload.customToken)
      if (!payload.bookingCompleted) {
        await createBookings(sortedAllSelectedSelections, trimmedName)
      }
      await refreshUser?.()
      setBookingStep('done')
      setSelectedSlots({})
    } catch {
      setBookingStatus('error')
      setBookingMessage('No se pudo confirmar. Revisa el código e intenta de nuevo.')
    } finally {
      setBookingStatus('idle')
    }
  }

  async function continueWithGoogle() {
    setBookingStatus('loading')
    setBookingMessage(null)
    try {
      const googleUser = await googleLogin()
      if (!googleUser) {
        setBookingStatus('idle')
        return
      }
      await loginUser(googleUser)
      await refreshUser?.()
      const bookerName = (googleUser.displayName || googleUser.email?.split('@')[0] || '').trim()
      if (!bookerName) throw new Error('missing_name')
      await createBookings(sortedAllSelectedSelections, bookerName)
      setBookingStep('done')
      setSelectedSlots({})
      setBookingStatus('idle')
    } catch {
      setBookingStatus('error')
      setBookingMessage('Ups, algo salió mal. Inténtalo de nuevo más tarde.')
    }
  }

  function openConfirm() {
    setBookingName((user?.nickname || user?.displayName || user?.name || '').trim())
    setBookingEmail((user?.email || '').trim())
    setOtpCode('')
    setShowBookingDetails(false)
    setBookingMessage(null)
    setBookingStep('details')
    setBookingModalOpen(true)
  }

  function movePeriod(amount: number) {
    setPeriodStart((current) => {
      const next = addDays(current, amount)
      next.setHours(0, 0, 0, 0)
      if (next < currentPeriodStart) return currentPeriodStart
      return next
    })
    setSelectedSlots({})
  }

  async function copyWhatsappSchedule() {
    if (!whatsappScheduleText) return

    setWhatsappCopyFailed(false)
    try {
      await copyTextToClipboard(whatsappScheduleText)
      setWhatsappCopied(true)
      setTimeout(() => setWhatsappCopied(false), 2000)
    } catch {
      setWhatsappCopyFailed(true)
      setTimeout(() => setWhatsappCopyFailed(false), 3000)
    }
  }

  return (
    <div className={`flex flex-col gap-6 ${selectedCount > 0 ? 'pb-28' : ''}`}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={name} src={heroPhoto} size={72} />
          <div className="min-w-0 flex-1">
            {name && (
              <h1 className="truncate text-2xl font-extrabold text-[var(--c-ocean)]">{name}</h1>
            )}
            <div className="mt-1">
              <VerifiedBadge verified={verified} />
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void copyWhatsappSchedule()}
            disabled={!canCopyWhatsappSchedule}
            aria-label="Copiar horarios para WhatsApp"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--c-border)] bg-white px-3.5 py-2 text-sm font-bold text-[var(--c-ocean)] transition-colors hover:border-[var(--c-aqua)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {whatsappCopied ? (
              <>
                <FiCheck aria-hidden="true" /> Copiado
              </>
            ) : whatsappCopyFailed ? (
              'No se pudo copiar'
            ) : (
              <>
                <FiCopy aria-hidden="true" /> Copiar para WhatsApp
              </>
            )}
          </button>
          <CopyLinkButton label="Compartir horarios" />
        </div>
      </header>

      {coach.bio && <p className="text-[var(--c-text-2)]">{coach.bio}</p>}

      {offerings.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--c-ocean)]">Horarios disponibles</h2>
              <p className="text-sm text-[var(--c-text-2)]">
                Elige una o más horas para reservar tu clase.
              </p>
            </div>
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--c-border)] text-sm font-bold text-[var(--c-ocean)] transition disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Periodo anterior"
                disabled={!canGoPreviousPeriod}
                onClick={() => movePeriod(-7)}
              >
                &#8592;
              </button>
              <span className="min-w-[8.5rem] text-center text-xs font-semibold text-[var(--c-ocean)]">
                {periodStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} →{' '}
                {addDays(periodStart, 6).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--c-border)] text-sm font-bold text-[var(--c-ocean)]"
                aria-label="Periodo siguiente"
                onClick={() => movePeriod(7)}
              >
                &#8594;
              </button>
            </div>
          </div>

          {dayRows.length > 0 ? (
            <CoachScheduleRows days={dayRows} />
          ) : (
            openOfferings.length === 0 && (
              <p className="text-sm text-[var(--c-text-2)]">
                Sin horarios disponibles en este periodo.
              </p>
            )
          )}

          {/* Open-schedule offerings: arrange directly over WhatsApp. */}
          {openOfferings.length > 0 && (
            <div className="flex flex-col gap-2">
              {openOfferings.map((offering) => {
                const url = whatsappUrl(
                  coach,
                  `Hola, vi tu perfil en nadamas.app y quiero agendar ${offeringTypeLabel(
                    offering
                  ).toLowerCase()} (${offeringContextLabel(offering).toLowerCase()}).`
                )
                return (
                  <div
                    key={offering.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-[var(--c-ocean)]">
                      {offeringTypeLabel(offering)} · Horario abierto
                    </span>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full bg-[var(--c-aqua)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--c-aqua-strong)]"
                      >
                        Agendar
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Single selection summary (across all offerings). */}
      {selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--c-border)] bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(10,37,64,0.12)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-[var(--c-ocean)]">
                {selectedCount} {selectedCount === 1 ? 'clase' : 'clases'}
              </p>
              <p className="truncate text-sm font-bold text-[var(--c-text-2)]">{selectedTotal}</p>
            </div>
            <button
              type="button"
              onClick={openConfirm}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--c-ocean)] px-6 py-2 text-sm font-bold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
            >
              Reservar
            </button>
          </div>
        </div>
      )}

      <Sheet
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        label="Confirmar reserva"
        keyboardAware
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--c-text-2)]">
          Confirmar reserva
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-[var(--c-ocean)]">
          {bookingStep === 'done' ? 'Clases agendadas' : selectedCountLabel(selectedCount)}
        </h2>

        {bookingStep === 'done' ? (
          <div className="mt-4 rounded-2xl bg-[var(--c-surface)] p-4">
            <p className="font-semibold text-[var(--c-ocean)]">
              Listo. El coach recibirá la notificación de estos horarios.
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--c-text-2)]">
              Cuando verifique tu pago te notificaremos por correo o por aquí. También podrás verlo
              en tu sección Mis clases.
            </p>
            <button
              type="button"
              onClick={() => setBookingModalOpen(false)}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--c-ocean)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-extrabold text-[var(--c-ocean)]">
                  {selectedCount} {selectedCount === 1 ? 'clase' : 'clases'}
                </span>
                <span className="font-extrabold text-[var(--c-ocean)]">{selectedTotal}</span>
              </div>
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowBookingDetails((current) => !current)}
                  aria-expanded={showBookingDetails}
                  className="inline-flex min-h-6 items-center text-right text-xs font-semibold text-[var(--c-text-2)] underline underline-offset-4 transition hover:text-[var(--c-ocean)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                >
                  {showBookingDetails ? 'Ocultar detalles' : 'Ver detalles'}
                </button>
              </div>
              {showBookingDetails && (
                <ul className="mt-3 grid gap-2">
                  {sortedAllSelectedSelections.map((selection) => (
                    <li
                      key={bookingSelectionKey(selection)}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-[var(--c-ocean)]">
                        {selectedDetailLabel(selection)}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-[var(--c-text-2)]">
                        {selection.priceCents !== null
                          ? formatPesos(selection.priceCents)
                          : 'Por definir'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 grid gap-3">
              {user ? (
                <>
                  <TextField
                    label="Nombre"
                    value={loggedBookingName}
                    disabled
                    readOnly
                    placeholder="Tu nombre"
                    autoComplete="name"
                    className="bg-[var(--c-surface)] text-[var(--c-text-2)] disabled:opacity-100"
                  />
                  <TextField
                    label="Correo"
                    type="email"
                    value={loggedBookingEmail}
                    disabled
                    readOnly
                    placeholder="tu@email.com"
                    autoComplete="email"
                    className="bg-[var(--c-surface)] text-[var(--c-text-2)] disabled:opacity-100"
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Nombre"
                    value={bookingName}
                    onChange={(event) => setBookingName(event.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                  />
                  <TextField
                    label="Correo"
                    type="email"
                    value={bookingEmail}
                    onChange={(event) => setBookingEmail(event.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                </>
              )}
              {!user && bookingStep === 'otp' && (
                <TextField
                  label="Código"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="000000"
                />
              )}
            </div>

            {!user && bookingStep === 'details' && (
              <div className="mt-3">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[var(--c-border)]" />
                  <p className="text-xs font-medium text-[var(--c-text-2)]">o usa otra opción</p>
                  <span className="h-px flex-1 bg-[var(--c-border)]" />
                </div>
                <button
                  type="button"
                  disabled={bookingStatus === 'loading'}
                  onClick={() => void continueWithGoogle()}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--c-border)] bg-white text-sm font-medium text-[var(--c-text-2)] transition hover:border-[var(--c-aqua)] hover:text-[var(--c-ocean)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="color-google" size="sm" />
                  Continuar con Google
                </button>
              </div>
            )}

            {bookingMessage && (
              <p
                className={`mt-3 text-sm ${
                  bookingStatus === 'error' ? 'text-[var(--rose-tx)]' : 'text-[var(--c-text-2)]'
                }`}
              >
                {bookingMessage}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={bookingStatus === 'loading'}
                onClick={() =>
                  user
                    ? void confirmLoggedBooking()
                    : bookingStep === 'otp'
                      ? void verifyOtpAndBook()
                      : void requestOtp()
                }
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--c-ocean)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {bookingStatus === 'loading'
                  ? 'Confirmando…'
                  : user || bookingStep === 'otp'
                    ? 'Reservar clase'
                    : 'Enviar código'}
              </button>
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--c-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)]"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
