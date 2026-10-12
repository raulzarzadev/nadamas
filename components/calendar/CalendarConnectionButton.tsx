'use client'

import { useId, useState } from 'react'
import { FiCalendar } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import CalendarConnectionCard from './CalendarConnectionCard'

export default function CalendarConnectionButton({
  calendarRole,
}: {
  calendarRole: 'athlete' | 'coach'
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div id="calendar" className="scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-controls={id}
        className="btn btn-outline min-h-11 gap-2"
      >
        <FiCalendar aria-hidden="true" /> Suscribirme al calendario
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Suscribirme al calendario" size="xl">
        <div id={id}>{open && <CalendarConnectionCard calendarRole={calendarRole} embedded />}</div>
      </Sheet>
    </div>
  )
}
