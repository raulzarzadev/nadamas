import { ROUTES } from '@/ROUTES'
import { formatInputDate } from '@/src/utils/Dates'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/router'

export default function EventsRow({ events = [], showNew = false }) {
  const router = useRouter()
  const handleClickEvent = (eventId) => {
    router.push(ROUTES.events?.details(eventId))
  }
  const handleNewEvent = () => {
    router.push(ROUTES.events?.new())
  }
  return (
    <div className="grid grid-flow-col overflow-auto gap-4 p-2">
      {showNew && (
        <button
          onClick={handleNewEvent}
          className="border rounded flex flex-col h-36 justify-center items-center w-24 shadow-md"
        >
          Nuevo evento
        </button>
      )}
      {!events?.length && (
        <div className="flex items-center justify-center">
          No hay eventos aún
        </div>
      )}
      {events?.map((event) => (
        <EventSmallCard event={event} key={event.id} handleClickEvent={handleClickEvent}/>
      ))}
    </div>
  )
}

const EventSmallCard = ({ event, handleClickEvent }) => {
  const msDia = 86400000
  const last5Days = event.date - new Date().getTime() < 5 * msDia
  return (
    <button
      style={{ backgroundImage: `url(${event.image})` }}
      className="relative border rounded flex flex-col h-36 justify-between w-32 shadow-md bg-no-repeat bg-cover bg-center"
      onClick={() => handleClickEvent(event.id)}
    >
      {last5Days && (
        <div className="absolute top-14 right-5 transform -rotate-45  bg-danger p-0.5 px-2 rounded-full">
          Ultimos Dias
        </div>
      )}
      <div className="text-center bg-primary rounded rounded-b-none w-full">
        {formatInputDate(event?.date, 'dd MMM yy')}
      </div>
      <div className="px-1 text-center text-xs w-full rounded-b-sm bg-primary">
        {event.title}
      </div>
    </button>
  )
}
