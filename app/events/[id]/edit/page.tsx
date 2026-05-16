'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { listenEvent } from '@/firebase/events'
import EventForm, { type EventDoc } from '@comps/events/EventForm'

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useUser()
  const [event, setEvent] = useState<EventDoc | null>(null)

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  useEffect(() => {
    listenEvent(id, (res: EventDoc) => setEvent(res))
  }, [id])

  if (!user) return null
  if (!event) return <p className="py-6 text-center opacity-60">Cargando…</p>

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-center mb-4">Editar evento</h1>
      <EventForm event={event} />
    </div>
  )
}
