import { useAuth } from '@/src/context/AuthContext'
import { useEffect, useState } from 'react'
import ButtonJoinEvent from '../ButtonJoinEvent'
import Link from 'next/link'
import { getPublicEvents } from '@/firebase/events'
import { format } from '@/src/utils/Dates'
import EventsRow from '../EventsRow'
import { ROUTES } from '@/ROUTES'
import Loading from '@comps/Loading'
import UpcomingEvents from './UpcomingEvents'
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
      <UpcomingEvents events={events} showNew={showNew && user?.coach} />
      {showGrid && <EventsGrid events={events} />}
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
  if (!event || !user) return <Loading />
  return (
    <Link href={ROUTES.events.details(event.id)}>
      <a className=" mx-auto hover:border-gray-200 border shadow-lg border-gray-500 flex flex-col h-56 w-full rounded text-center justify-between p-1">
        <div>
          <h5 className="font-bold text-sm ">{event?.title}</h5>
          <div className="font-bold text-xs">
            {format(event?.date, 'dd MMM yy')}
          </div>
        </div>
        <p className="max-h-36 overflow-auto">{event?.description}</p>
        <ButtonJoinEvent athleteId={user?.athleteId} event={event} />
      </a>
    </Link>
  )
}
