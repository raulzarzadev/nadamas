import { ROUTES } from '@/pages/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import Button from '@comps/inputs/Button'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ButtonJoinEvent from '../ButtonJoinEvent'
import Link from 'next/link'
import { getPublicEvents } from '@/firebase/events'
import { format } from '@/src/utils/Dates'
import EventsRow from '../EventsRow'
export default function PublicEvents({ showNew, showGrid }) {
  const [events, setEvents] = useState([])
  useEffect(() => {
    getPublicEvents()
      .then((res) => {
        setEvents(res)
      })
      .catch((err) => console.log(`err`, err))
  }, [])

  const { user } = useAuth()
  return (
    <div className=" max-w-3xl mx-auto ">
      <h3>Proximos</h3>
      <EventsRow events={events} showNew={showNew && user?.coach} />
      {showGrid && <EventsGrid events={events} />}
      {/* 
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 grid-flow-row ">
      {events?.map((event) => (
      <Event event={event} key={event?.id} />
      ))}
      </div>
         */}
    </div>
  )
}
const EventsGrid = ({ events }) => {
  return (
    <div>
      <h3>Todos los eventos</h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 grid-flow-row ">
        {events?.map((event) => (
          <Event event={event} key={event?.id} />
        ))}
      </div>
    </div>
  )
}

const Event = ({ event }) => {
  const { user } = useAuth()
  return (
    <Link href={ROUTES.events.details(event.id)}>
      <a className=" mx-auto hover:border-gray-200 border shadow-lg border-gray-500 flex flex-col h-36 w-full rounded text-center justify-between p-1">
        <div>{format(event?.date, 'dd MMM yy')}</div>
        <p className="max-h-16 overflow-auto">{event?.description}</p>
        <h5>{event?.title}</h5>
        <ButtonJoinEvent athleteId={user?.athleteId} eventId={event.id} />
      </a>
    </Link>
  )
}
