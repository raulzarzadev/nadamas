import { getEvent } from '@/legasy/firebase/events'
import Loading from '@/components/Loading'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import FormEvent from '../FormEvent'

export default function EditEvent() {
  const [event, setEvent] = useState(undefined)
  const router = useRouter()
  const {
    query: { id: eventId }
  } = router
  useEffect(() => {
    if (eventId)
      getEvent(eventId, setEvent)
       /*  .then(setEvent)
        .catch((err) => console.log(`err`, err)) */
  }, [eventId])

  const handleDiscard = () => {
    router.back()
  }
  if (event===undefined) return <Loading />

  return (
    <div className="">
      <FormEvent event={event} discard={handleDiscard} />
    </div>
  )
}
