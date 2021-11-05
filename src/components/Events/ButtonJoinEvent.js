import {
  athleteCancelEventRequest,
  athleteJoinEvent,
  athleteRequestJoinEvent,
  athleteUnjoinEvent
} from '@/firebase/events'
import Info from '@comps/Alerts/Info'
import Button from '@comps/inputs/Button'
import { useEffect, useState } from 'react'

export default function ButtonJoinEvent({ eventId, athleteId, event }) {
  const [alert, setAlert] = useState(null)
  const handleClick = (e) => {
    if (!athleteId) {
      setAlert(<Info text="Debes crear un atleta primero" />)
      setTimeout(() => {
        setAlert(null)
      }, 1000)
    } else {
      athleteRequestJoinEvent(eventId, athleteId)
        .then((res) => console.log(`res`, res))
        .catch((err) => console.log(`err`, err))
    }
  }
  const [responseStatus, setResponseStatus] = useState(undefined)

  const handleJoin = (eventId) => {
    athleteRequestJoinEvent(eventId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.whatingRes)
      })
      .catch((err) => console.log(`err`, err))
  }
  const handleCancelRequest = (eventId) => {
    athleteCancelEventRequest(eventId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.notJoined)
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleUnjoin = (eventId) => {
    athleteUnjoinEvent(eventId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.notJoined)
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
      label: 'Salir',
      handleClick: handleUnjoin
    }
  }

  const getRequestStatus = (athleteId, event) => {
    console.log(`event`, event, athleteId)
    if (event?.requests?.includes(athleteId)) {
      return REQUEST_STATUS.whatingRes
    } else {
    }
    if (event?.participans?.includes(athleteId)) {
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
        onClick={() => {
          handleClick()
          responseStatus?.handleClick(eventId)
        }}
        label={responseStatus?.label}
      />
    </div>
  )
}
