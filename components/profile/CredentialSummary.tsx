'use client'

import { useEffect, useState } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import CoachBadge from '@/components/ui/coach-badge'
import { useUser } from '@/context/UserContext'
import { PaymentCRUD } from '@/firebase/payments/main'
import type { AthleteCredential } from '@/lib/athlete-identity'
import { localPaymentDate, paymentAvailable } from '@/lib/payments/engine'
import { ensureAthleteBookings, useAppDispatch, useAppSelector } from '@/lib/store/athlete-bookings'

export default function CredentialSummary({ credential }: { credential: AthleteCredential }) {
  const { user } = useUser()
  const uid = user?.uid || user?.id || ''
  const dispatch = useAppDispatch()
  const { schools, status } = useSchoolSelection({ includePersonal: true, athleteMode: true })
  const state = useAppSelector((state) => state.athleteBookings)
  const [bookingError, setBookingError] = useState(false)
  const [plans, setPlans] = useState<string[] | null>(null)
  const [paymentError, setPaymentError] = useState(false)

  useEffect(() => {
    if (!uid) return
    let active = true
    dispatch(ensureAthleteBookings(uid)).catch(() => {
      if (active) setBookingError(true)
    })
    return () => {
      active = false
    }
  }, [dispatch, uid])

  const bookings = state.uid === uid ? state.bookings : []
  const schoolScopes = schools.map(({ school }) => `schoolId=${encodeURIComponent(school.id)}`)
  const coachScopes = bookings
    .filter((booking) => !booking.schoolId && booking.coachId)
    .map((booking) => `coachId=${encodeURIComponent(booking.coachId)}`)
  const scopeKey = [...new Set([...schoolScopes, ...coachScopes])].sort().join('&scope=')

  useEffect(() => {
    if (status === 'loading' || !state.loaded || state.uid !== uid) return
    let active = true
    setPlans(null)
    setPaymentError(false)
    const scopes = scopeKey ? scopeKey.split('&scope=') : []
    Promise.allSettled(
      scopes.map(async (scope) => {
        const data = await PaymentCRUD.get(`/api/payments?${scope}&view=student`)
        const student = data.students.find((student) =>
          scope.startsWith('schoolId=')
            ? student.profileId === credential.profileId
            : student.id === credential.profileId
        )
        if (!student) return []
        const account = data.accounts[student.id] || { grants: [] }
        const today = localPaymentDate(Date.now(), data.settings.timezone)
        const periods = account.grants.filter(
          (grant) =>
            grant.product.mode === 'period' &&
            grant.startsOn <= today &&
            (!grant.endsBefore || today < grant.endsBefore)
        )
        const labels = periods.map((grant) => `${grant.product.name} · vigente`)
        const classes = paymentAvailable(account, today)
        if (classes > 0)
          labels.push(`${classes} ${classes === 1 ? 'clase restante' : 'clases restantes'}`)
        return labels
      })
    ).then((results) => {
      if (!active) return
      setPlans(results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])))
      setPaymentError(status === 'error' || results.some((result) => result.status === 'rejected'))
    })
    return () => {
      active = false
    }
  }, [scopeKey, credential.profileId, status, state.loaded, state.uid, uid])

  const next = bookings
    .filter((booking) => {
      const matches = booking.schoolClassId
        ? booking.schoolClassProfileIds?.includes(credential.profileId)
        : (booking.additionalProfileId || booking.athleteProfileId || booking.athleteId) ===
          credential.profileId
      return (
        matches &&
        booking.status === 'confirmed' &&
        new Date(`${booking.date}T${booking.startTime}`).getTime() > Date.now()
      )
    })
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))[0]

  return (
    <div className="grid gap-2 border-t border-(--c-border) px-5 py-3 text-xs text-(--c-text-2)">
      <p>
        {plans === null
          ? bookingError
            ? 'Plan no disponible por ahora.'
            : 'Consultando plan…'
          : plans.length
            ? plans.join(' · ')
            : paymentError
              ? 'Plan no disponible por ahora.'
              : 'Sin plan vigente ni clases disponibles.'}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {next ? (
          <>
            <span>
              Próxima clase ·{' '}
              {new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(
                new Date(`${next.date}T12:00:00`)
              )}{' '}
              · {next.startTime}
            </span>
            <CoachBadge name={next.coachName || 'Profe por asignar'} unassigned={!next.coachName} />
          </>
        ) : (
          <span>
            {bookingError
              ? 'Próxima clase no disponible por ahora.'
              : !state.loaded
                ? 'Consultando próxima clase…'
                : 'Sin próxima clase agendada.'}
          </span>
        )}
      </div>
    </div>
  )
}
