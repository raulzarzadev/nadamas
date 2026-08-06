'use client'

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'

type CoachAgendaShareValue = {
  scheduleText: string
  setScheduleText: (text: string) => void
}

const CoachAgendaShareContext = createContext<CoachAgendaShareValue>({
  scheduleText: '',
  setScheduleText: () => {},
})

export function CoachAgendaShareProvider({ children }: { children: ReactNode }) {
  const [scheduleText, setScheduleText] = useState('')
  const value = useMemo(() => ({ scheduleText, setScheduleText }), [scheduleText])

  return (
    <CoachAgendaShareContext.Provider value={value}>{children}</CoachAgendaShareContext.Provider>
  )
}

export function useCoachAgendaShare() {
  return useContext(CoachAgendaShareContext)
}
