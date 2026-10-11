'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { useUser } from '@/context/UserContext'
import { type AppStore, bookingActions, makeAppStore } from '@/lib/store/athlete-bookings'

export default function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const store = useRef<AppStore | null>(null)
  if (!store.current) store.current = makeAppStore()
  const currentStore = store.current
  const { user } = useUser()
  const uid = user?.uid || user?.id || ''
  useEffect(() => {
    if (currentStore.getState().athleteBookings.uid !== uid)
      currentStore.dispatch(bookingActions.reset())
  }, [uid, currentStore])
  return <Provider store={currentStore}>{children}</Provider>
}
