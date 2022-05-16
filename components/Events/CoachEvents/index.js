import { useUser } from '@/context/UserContext'
import { useEffect, useState } from 'react'
import EventsRow from '../EventsRow'

export default function CoachEvents() {
  const [events, setEvents] = useState([])
  const { user } = useUser()
  /* useEffect(() => {
    getEvents(user.id)
      .then(setEvents)
      .catch((err) => console.log(`err`, err))
  }, []) */
  return <EventsRow events={events} showNew={true} />
}
