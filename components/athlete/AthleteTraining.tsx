'use client'

import { useEffect, useMemo, useState } from 'react'
import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import TrainingPlanner from '@/components/coach/TrainingPlanner'
import { useUser } from '@/context/UserContext'
import { isPastAthleteBooking } from '@/lib/athlete-upcoming-count'
import type { Booking } from '@/lib/coach-booking'
import { ensureAthleteBookings, useAppDispatch, useAppSelector } from '@/lib/store/athlete-bookings'
import { reportInternalError } from '@/lib/user-facing-error'
import AthleteNextClass from './AthleteNextClass'

// Athlete Entrenos: plan search on top; the planner's empty state can open that same search.
export default function AthleteTraining() {
  const { user } = useUser()
  const uid = user?.uid || user?.id
  const dispatch = useAppDispatch()
  const bookingState = useAppSelector((state) => state.athleteBookings)
  const [searchOpen, setSearchOpen] = useState(false)
  // No plans yet: the empty state carries "Buscar entrenos", so the top bar would repeat it.
  const [empty, setEmpty] = useState(false)
  const bookings = bookingState.uid === uid && bookingState.loaded ? bookingState.bookings : null

  useEffect(() => {
    if (!uid) return
    void dispatch(ensureAthleteBookings(uid)).catch((cause) => {
      reportInternalError('ATHLETE_TRAINING_BOOKINGS_LOAD', cause)
    })
  }, [dispatch, uid])

  const nextClass = useMemo<Booking | null>(() => {
    if (!bookings) return null
    return (
      bookings
        .filter(
          (booking) =>
            booking.status === 'confirmed' &&
            !booking.schoolRequestId &&
            booking.source !== 'school-request' &&
            !isPastAthleteBooking(booking)
        )
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0] ||
      null
    )
  }, [bookings])

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-4xl">
        <AthleteSearchBar
          defaultTab="plans"
          open={searchOpen}
          onOpenChange={setSearchOpen}
          hideTrigger={empty}
        />
      </div>
      {nextClass && (
        <div className="mx-auto w-full max-w-4xl px-3 pb-4 sm:px-0">
          <AthleteNextClass booking={nextClass} />
        </div>
      )}
      <TrainingPlanner onSearch={() => setSearchOpen(true)} onEmptyChange={setEmpty} />
    </div>
  )
}
