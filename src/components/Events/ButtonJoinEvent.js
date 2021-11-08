import {
  athleteCancelEventRequest,
  athleteSendRequestEvent,
  athleteUnjoinEvent
} from '@/firebase/events'
import Info from '@comps/Alerts/Info'
import Button from '@comps/inputs/Button'
import { useEffect, useState } from 'react'

export default function ButtonJoinEvent({ athleteId, event }) {
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(false)
  const [responseStatus, setResponseStatus] = useState(undefined)

  const handleJoin = (eventId) => {
    console.log(`eventId, athleteId`, eventId, athleteId)
    athleteSendRequestEvent(eventId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.whatingRes)
        setLoading(false)
      })
      .catch((err) => console.log(`err`, err))
  }
  const handleCancelRequest = (eventId) => {
    athleteCancelEventRequest(eventId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.notJoined)
        setLoading(false)
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleUnjoin = (eventId) => {
    const eventAthlete = event?.participants?.find(({ id }) => id==athleteId)
    athleteUnjoinEvent(eventId, eventAthlete)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.notJoined)
        setLoading(false)
      })
      .catch((err) => console.log(`err`, err))
  }

  const REQUEST_STATUS = {
    notJoined: {
      type: 'NOT_JOINED',
      label: 'Unirse',
      handleClick: handleJoin
    },
    whatingRes: {
      type: 'WATING_RESPONSE',
      label: 'Cancelar unirse',
      handleClick: handleCancelRequest
    },
    resRejected: {
      type: 'REQUEST_REJECTED',
      label: 'Solicitud rechazada',
      handleClick: () => {
        console.log('solicitud rechada')
      }
    },
    alreadyIn: {
      type: 'ALREDY_JOINED',
      label: 'Ya estas dentro. ¿Salir?',
      handleClick: handleUnjoin
    }
  }

  const getRequestStatus = (athleteId, event) => {
    if (event?.requests?.includes(athleteId)) {
      return REQUEST_STATUS.whatingRes
    } else {
    }
    if (event?.participants?.find(({ id }) => id === athleteId)) {
      return REQUEST_STATUS.alreadyIn
    } else {
      return REQUEST_STATUS.notJoined
    }
  }

  useEffect(() => {
    setResponseStatus(getRequestStatus(athleteId, event))
  }, [])

  return (
    <div>
      {alert && (
        <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center z-10">
          <div className="bg-black border-2 rounded-2xl">{alert}</div>
        </div>
      )}
      <Button
        loading={loading}
        onClick={async (e) => {
          setLoading(true)
          e.stopPropagation()
          e.preventDefault()
          responseStatus?.handleClick(event.id)
        }}
        label={responseStatus?.label}
      />
    </div>
  )
}
