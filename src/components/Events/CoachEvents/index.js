import { getEvents } from '@/firebase/events'
import { useAuth } from '@/src/context/AuthContext'
import { format } from '@/src/utils/Dates'
import { useEffect, useState } from 'react'
import EventsRow from '../EventsRow'

export default function CoachEvents() {
  const [events, setEvents] = useState([])
  const { user } = useAuth()
  useEffect(() => {
    getEvents(user.id)
      .then(setEvents)
      .catch((err) => console.log(`err`, err))
  }, [])
  return <EventsRow events={events} showNew={true} />
}
