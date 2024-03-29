import { useAuth } from '@/legasy/src/context/AuthContext'
import { useEffect, useState } from 'react'
import { getUpcomingEvents } from '@/legasy/firebase/events'
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
      <h3 className='text-center text-2xl pt-3 mb-3'>Proximos eventos</h3>
      <EventsRow events={events} showNew={showNew && user?.coach} />
    </div>
  )
}
