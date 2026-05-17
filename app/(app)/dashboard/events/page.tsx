'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { listenUserEvents } from '@/firebase/events'
import type { EventDoc } from '@comps/events/EventForm'

export default function EventsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [events, setEvents] = useState<EventDoc[] | null>(null)

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  useEffect(() => {
    if (!user) return
    listenUserEvents((res: EventDoc[]) => setEvents(res))
  }, [user])

  if (!user) return null

  return (
    <div className="py-6 max-w-md mx-auto flex flex-col gap-4 text-base-content">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Eventos</h1>
        <Link className="btn btn-primary btn-sm" href="/dashboard/events/new">
          Nuevo
        </Link>
      </header>

      {events === null && <p className="opacity-60">Cargando…</p>}
      {events?.length === 0 && (
        <p className="opacity-60">Aún no tienes eventos.</p>
      )}

      <ul className="flex flex-col gap-2">
        {events?.map((ev) => (
          <li key={ev.id}>
            <Link
              href={`/dashboard/events/${ev.id}`}
              className="card bg-base-200 p-4 block hover:bg-base-300 transition-colors"
            >
              <span className="font-semibold">{ev.title}</span>
              {ev.date && (
                <span className="block text-sm opacity-70">
                  {new Date(ev.date).toLocaleDateString('es-MX')}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
