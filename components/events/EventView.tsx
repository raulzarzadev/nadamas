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
    router.push('/athlete/progress')
  }

  return (
    <article className="max-w-md mx-auto flex flex-col gap-3 text-[var(--c-ocean)]">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        {status && (
          <span className="badge badge-outline">{status.label}</span>
        )}
      </header>

      {event.date && (
        <p className="text-[var(--c-text-2)]">
          {new Date(event.date).toLocaleDateString('es-MX', {
            dateStyle: 'long',
          })}
        </p>
      )}

      {event.description && (
        <p className="whitespace-pre-wrap">{event.description}</p>
      )}

      {!event.publicEvent && (
        <span className="text-xs text-[var(--c-text-2)]">Privado</span>
      )}

      {isOwner && (
        <div className="flex gap-2 pt-2">
          <Link
            className="btn btn-sm"
            href={`/athlete/progress/${event.id}/edit`}
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
