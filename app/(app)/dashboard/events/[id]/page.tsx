'use client'
import { use, useEffect, useState } from 'react'
import { listenEvent } from '@/firebase/events'
import EventView from '@comps/events/EventView'
import type { EventDoc } from '@comps/events/EventForm'

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [event, setEvent] = useState<(EventDoc & { userId?: string }) | null>(
    null
  )

  useEffect(() => {
    listenEvent(id, (res: EventDoc & { userId?: string }) => setEvent(res))
  }, [id])

  if (!event) return <p className="py-6 text-center opacity-60">Cargando…</p>

  return (
    <div className="py-6">
      <EventView event={event} />
    </div>
  )
}
