'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import EventForm from '@comps/events/EventForm'

export default function NewEventPage() {
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-center mb-4">Nuevo evento</h1>
      <EventForm />
    </div>
  )
}
