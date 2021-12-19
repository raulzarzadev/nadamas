import { useAuth } from '@/src/context/AuthContext'
import { useEffect, useState } from 'react'
import ButtonJoinEvent from '../ButtonJoinEvent'
import Link from 'next/link'
import { getPublicEvents } from '@/firebase/events'
import { formatInputDate } from '@/src/utils/Dates'
import { ROUTES } from '@/ROUTES'
import Loading from '@comps/Loading'
import UpcomingEvents from './UpcomingEvents'
import MustBeAuthenticated from '@comps/MainLayout/PageErrors/MustBeAuthenticated'
import EventStatus from '../EventStatus'
import Image from 'next/image'
export default function PublicEvents({ showNew, showGrid }) {
  const [events, setEvents] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    getPublicEvents()
      .then((res) => {
        setEvents(res)
      })
      .catch((err) => {
        console.log(`err`, err)
      })
  }, [])
  return (
    <div className=" max-w-3xl mx-auto ">
      <UpcomingEvents events={events} showNew={showNew && user?.coach} />
      {showGrid && <EventsGrid events={events} />}
    </div>
  )
}
const EventsGrid = ({ events }) => {
  const sortByDate = (a, b) => {
    if (a.date > b.date) return -1
    if (a.date < b.date) return 1
    return 0
  }
  return (
    <div>
      <h3 className="my-3 text-2xl text-center">Todos los eventos</h3>
      <div className="grid p-3 gap-8 grid-cols-1 sm:grid-cols-2  grid-flow-row ">
        {events?.sort(sortByDate).map((event) => (
          <Event event={event} key={event?.id} />
        ))}
      </div>
    </div>
  )
}

const Event = ({ event }) => {
  const { user } = useAuth()
  if (!event) return <Loading />
  return (
    <Link href={ROUTES.events.details(event.id)}>
      <a className="relative bg-secondary  dark:bg-secondary-dark hover:border-primary border-2 border-transparent mx-auto  shadow-lg  flex flex-col  w-full rounded text-center justify-between ">
          <Image
            src={event.image}
            layout="fill"
            objectFit="cover"
            className="opacity-20"
          />
        <header className="relative " className="p-0.5">
          <h5 className="font-bold  text-base ">{event?.title}</h5>
          <div className="font-bold text-xs">
            {formatInputDate(event?.date, 'dd MMM yy')}
          </div>
          <EventStatus status={event.status} />
        </header>
        <main className="p-0.5">
          <p
            style={{ minHeight: '50px' }}
            className="max-h-36   overflow-auto whitespace-pre-wrap truncate"
          >
            {event?.description}
          </p>
        </main>
        <footer className="flex justify-center p-2">
          <ButtonJoinEvent athleteId={user?.athleteId} event={event} />
        </footer>
      </a>
    </Link>
  )
}
