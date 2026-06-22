'use client'
import EventForm from '@comps/events/EventForm'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useUser } from '@/context/UserContext'

export default function NewEventPage() {
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">Nuevo evento</h1>
        <p className="mt-2 text-[var(--c-text-2)]">
          Registra una sesión o una marca para seguir tu progreso.
        </p>
      </header>
      <EventForm />
    </div>
  )
}
