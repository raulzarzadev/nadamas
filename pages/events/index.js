import { getPublicEvents } from '@/firebase/events'
import { format } from '@/src/utils/Dates'
import Button from '@comps/inputs/Button'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ROUTES } from '../ROUTES'
import Link from 'next/link'
import { useAuth } from '@/src/context/AuthContext'

export default function Events() {
  const router = useRouter()
  const [events, setEvents] = useState([])
  useEffect(() => {
    getPublicEvents()
      .then((res) => {
        setEvents(res)
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }, [])

  const { user } = useAuth()
  return (
    <div className=" max-w-xl mx-auto py-10">
      Eventos Publicos
      {user?.coach && (
        <div className="flex w-36 mx-auto my-6">
          <Button
            label="Nuevo Evento"
            onClick={() => router.push(ROUTES.events.new())}
          />
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 grid-flow-row ">
        {events?.map((event) => (
          <Event event={event} key={event?.id} />
        ))}
      </div>
    </div>
  )
}
const Event = ({ event }) => {
  const handleJoin = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log(`e`, e)
  }
  return (
    <Link href={ROUTES.events.details(event.id)}>
      <a className=" mx-auto hover:border-gray-200 border shadow-lg border-gray-500 flex flex-col h-36 w-full rounded text-center justify-between p-1">
        <div>{format(event?.date, 'dd MMM yy')}</div>
        <p>{event?.description}</p>
        <h5>{event?.title}</h5>
        <Button size="xs" label="Apuntate" onClick={handleJoin}></Button>
      </a>
    </Link>
  )
}
