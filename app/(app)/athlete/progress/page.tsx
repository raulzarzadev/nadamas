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
    <div className="py-6 max-w-md mx-auto flex flex-col gap-4 text-[var(--c-ocean)]">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi progreso</h1>
        <Link className="btn btn-primary btn-sm" href="/athlete/progress/new">
          Nuevo
        </Link>
      </header>

      {events === null && <p className="text-[var(--c-text-2)]">Cargando…</p>}
      {events?.length === 0 && (
        <p className="text-[var(--c-text-2)]">Aún no tienes eventos.</p>
      )}

      <ul className="flex flex-col gap-2">
        {events?.map((ev) => (
          <li key={ev.id}>
            <Link
              href={`/athlete/progress/${ev.id}`}
              className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] p-4 block hover:shadow-[var(--shadow-sm)] transition-shadow"
            >
              <span className="font-semibold">{ev.title}</span>
              {ev.date && (
                <span className="block text-sm text-[var(--c-text-2)]">
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
