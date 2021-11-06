import { ROUTES } from '@/ROUTES'
import { formatInputDate } from '@/src/utils/Dates'
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
    <div className="grid grid-flow-col overflow-auto gap-3 p-2">
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
        <button
          key={event.id}
          style={{ backgroundImage: `url(${event.image})` }}
          className="border rounded flex flex-col h-36 justify-between w-32 shadow-md bg-no-repeat bg-cover bg-center"
          onClick={() => handleClickEvent(event.id)}
        >
          <div className="text-center bg-red-400 rounded rounded-b-none w-full">
            {formatInputDate(event?.date, 'dd MMM yy')}
          </div>
          <div className="px-1 text-center text-xs w-full rounded-b-sm bg-gray-600">
            {event.title}
          </div>
        </button>
      ))}
    </div>
  )
}
