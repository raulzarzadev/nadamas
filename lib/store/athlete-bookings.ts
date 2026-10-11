'use client'
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { auth } from '@/firebase/index'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'

const slice = createSlice({
  name: 'athleteBookings',
  initialState: { uid: '', loaded: false, revision: 0, bookings: [] as Booking[] },
  reducers: {
    received(state, action: PayloadAction<{ uid: string; bookings: Booking[] }>) {
      state.uid = action.payload.uid
      state.loaded = true
      state.bookings = action.payload.bookings
    },
    upsert(state, action: PayloadAction<Booking[]>) {
      state.revision++
      for (const booking of action.payload) {
        const index = state.bookings.findIndex((item) => item.id === booking.id)
        if (index < 0) state.bookings.push(booking)
        else state.bookings[index] = booking
      }
    },
    cancelled(state, action: PayloadAction<string>) {
      state.revision++
      const booking = state.bookings.find((item) => item.id === action.payload)
      if (booking) booking.status = 'cancelled'
    },
    reset: () => ({ uid: '', loaded: false, revision: 0, bookings: [] as Booking[] }),
  },
})
export const bookingActions = slice.actions
export const makeAppStore = () => configureStore({ reducer: { athleteBookings: slice.reducer } })
export type AppStore = ReturnType<typeof makeAppStore>
export type AppState = ReturnType<AppStore['getState']>
export const useAppDispatch = useDispatch.withTypes<AppStore['dispatch']>()
export const useAppSelector = useSelector.withTypes<AppState>()

const pending = new Map<string, Promise<Booking[]>>()
export const ensureAthleteBookings =
  (uid: string, refresh = false) =>
  async (dispatch: AppStore['dispatch'], getState: () => AppState): Promise<Booking[]> => {
    const state = getState().athleteBookings
    if (!refresh && state.uid === uid && state.loaded) return state.bookings
    let request = pending.get(uid)
    if (!request) {
      request = getAuthed('/api/bookings')
        .then(async (response) => {
          const payload = (await response.json()) as { bookings?: Booking[] }
          return payload.bookings || []
        })
        .finally(() => pending.delete(uid))
      pending.set(uid, request)
    }
    const bookings = await request
    const current = getState().athleteBookings
    if (current.uid === uid && current.loaded && current.revision !== state.revision)
      return current.bookings
    if (auth.currentUser?.uid === uid) dispatch(bookingActions.received({ uid, bookings }))
    return bookings
  }
