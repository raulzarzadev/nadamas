import { getEvent } from '@/firebase/events'
import { useAuth } from '@/src/context/AuthContext'
import { format } from '@/src/utils/Dates'
import Button from '@comps/inputs/Button'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Event() {
  const { user } = useAuth()
  const [event, setEvent] = useState(undefined)
  const router = useRouter()
  useEffect(() => {
    const {
      query: { id: eventId }
    } = router
    getEvent(eventId)
      .then(setEvent)
      .catch((err) => console.log(`err`, err))
  }, [])
  console.log(`event`, event)
  const [athleteId, setAthleteId] = useState(undefined)
  useEffect(() => {
    setAthleteId(user.athleteId)
  }, [])
  const handleJoin = () => {
    if (!athleteId) {
      console.log(`debes tener un athleta primero`)
    } else {
      console.log('unirse al evento con el id athlete', user.athleteId)
    }
  }
  return (
    <div className="max-w-sm mx-auto py-4">
      <div>{format(event?.date, 'dd MMM yy')}</div>
      <div>{event?.title}</div>
      <div>{event?.description}</div>
      <Button
        // disabled={!athleteId}
        label="Apuntate"
        onClick={handleJoin}
      ></Button>
    </div>
  )
}
