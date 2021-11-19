import { useAuth } from '@/src/context/AuthContext'
import { useEffect, useState } from 'react'
import ButtonJoinEvent from '../ButtonJoinEvent'
import Link from 'next/link'
import { getPublicEvents } from '@/firebase/events'
import { format, formatInputDate } from '@/src/utils/Dates'
import EventsRow from '../EventsRow'
import { ROUTES } from '@/ROUTES'
import Loading from '@comps/Loading'
import UpcomingEvents from './UpcomingEvents'
import Info from '@comps/Alerts/Info'
import MustBeAuthenticated from '@comps/MainLayout/PageErrors/MustBeAuthenticated'
export default function PublicEvents({ showNew, showGrid }) {
  const [events, setEvents] = useState([])
  const { user } = useAuth()
  if (!user) return <MustBeAuthenticated />

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
    if (a.date > b.date) return 1
    if (a.date < b.date) return -1
    return 0
  }
  return (
    <div>
      <h3 className='my-3 text-2xl text-center'>Todos los eventos</h3>
      <div className="grid p-3 gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 grid-flow-row ">
        {events?.sort(sortByDate).map((event) => (
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
      <a className=" mx-auto hover:border-gray-200 border shadow-lg border-gray-500 flex flex-col  w-full rounded text-center justify-between p-1">
        <div>
          <h5 className="font-bold  text-base ">{event?.title}</h5>
          <div className="font-bold text-xs">
            {formatInputDate(event?.date, 'dd MMM yy')}
          </div>
        </div>
        <p className="max-h-36 overflow-auto whitespace-pre-wrap">{event?.description}</p>
        <ButtonJoinEvent athleteId={user?.athleteId} event={event} />
      </a>
    </Link>
  )
}
