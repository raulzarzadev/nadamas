'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteEvent } from '@/firebase/events'
import { useUser } from '@/context/UserContext'
import STATUS_EVENT from '@/CONSTANTS/STATUS_EVENT'
import type { EventDoc } from './EventForm'

export default function EventView({ event }: { event: EventDoc & { userId?: string } }) {
  const router = useRouter()
  const { user } = useUser()
  const isOwner = !!user && user.uid === event.userId
  const status = (STATUS_EVENT as Record<string, { label: string }>)[
    event.status ?? ''
  ]

  const onDelete = async () => {
    if (!confirm('¿Eliminar este evento?')) return
    await deleteEvent(event.id)
    router.push('/dashboard/events')
  }

  return (
    <article className="max-w-md mx-auto flex flex-col gap-3 text-base-content">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        {status && (
          <span className="badge badge-outline">{status.label}</span>
        )}
      </header>

      {event.date && (
        <p className="opacity-80">
          {new Date(event.date).toLocaleDateString('es-MX', {
            dateStyle: 'long',
          })}
        </p>
      )}

      {event.description && (
        <p className="whitespace-pre-wrap">{event.description}</p>
      )}

      {!event.publicEvent && (
        <span className="text-xs opacity-60">Privado</span>
      )}

      {isOwner && (
        <div className="flex gap-2 pt-2">
          <Link
            className="btn btn-sm"
            href={`/dashboard/events/${event.id}/edit`}
          >
            Editar
          </Link>
          <button className="btn btn-sm btn-error" onClick={onDelete}>
            Eliminar
          </button>
        </div>
      )}
    </article>
  )
}
