import { useAuth } from '@/src/context/AuthContext'
import { useEffect, useState } from 'react'
import { getUpcomingEvents } from '@/firebase/events'
import EventsRow from '../EventsRow'

export default function UpcomingEvents({ showNew }) {
  const [events, setEvents] = useState([])
  useEffect(() => {
    getUpcomingEvents()
      .then((res) => {
        setEvents(res)
      })
      .catch((err) => console.log(`err`, err))
  }, [])

  const { user } = useAuth()
  return (
    <div className=" max-w-3xl mx-auto ">
      <h3>Proximos eventos</h3>
      <EventsRow events={events} showNew={showNew && user?.coach} />
    </div>
  )
}
