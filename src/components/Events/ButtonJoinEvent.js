import {
  athleteCancelEventRequest,
  athleteSendRequestEvent,
  athleteUnjoinEvent
} from '@/firebase/events'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { useEffect, useState } from 'react'

export default function ButtonJoinEvent({ athleteId, event }) {
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(false)
  const [responseStatus, setResponseStatus] = useState(undefined)
  const [eventAthlete] = useState(
    event?.participants?.find(({ id }) => id == athleteId)
  )

  const handleJoin = (eventId) => {
    setLoading(true)
    athleteSendRequestEvent(eventId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.whatingRes)
        setLoading(false)
      })
      .catch((err) => console.log(`err`, err))
  }
  const handleCancelRequest = (eventId) => {
    setLoading(true)
    athleteCancelEventRequest(eventId, athleteId)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.notJoined)
        setLoading(false)
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleUnjoin = (eventId) => {
    setLoading(true)
    athleteUnjoinEvent(eventId, eventAthlete)
      .then((res) => {
        setResponseStatus(REQUEST_STATUS.notJoined)
        setLoading(false)
      })
      .catch((err) => console.log(`err`, err))
  }

  const [openAlreadyIn, setOpenAlreadyIn] = useState(false)
  const handleOpenAlreadyIn = () => {
    setOpenAlreadyIn(!openAlreadyIn)
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
    alreadyIn: function (participant) {
      return {
        type: 'ALREDY_JOINED',
        label: `Eres el participante No.${participant?.number}`,
        handleClick: handleOpenAlreadyIn
      }
    }
  }

  const getRequestStatus = (athleteId, event) => {
    if (event?.requests?.includes(athleteId)) {
      return REQUEST_STATUS.whatingRes
    } else {
    }
    const participant = event?.participants?.find(({ id }) => id === athleteId)
    if (participant) {
      console.log(`participant`, participant)
      return REQUEST_STATUS.alreadyIn(participant)
    } else {
      return REQUEST_STATUS.notJoined
    }
  }

  useEffect(() => {
    setResponseStatus(getRequestStatus(athleteId, event))
  }, [])

  const [openUnjoin, setOpenUnjoin] = useState(false)
  const handleOpenUnjoin = () => {
    setOpenUnjoin(!openUnjoin)
  }

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
          e.stopPropagation()
          e.preventDefault()
          responseStatus?.handleClick(event.id)
        }}
        label={responseStatus?.label}
      />
      <Modal
        handleOpen={handleOpenAlreadyIn}
        open={openAlreadyIn}
        title="Participante No."
      >
        <div className="text-base">
          Tu numero de participante es el:
          <div>
            No.
            <span className="font-bold text-3xl mx-2">{`${eventAthlete?.number}`}</span>
          </div>
          <div className="w-1/2 mx-auto">
            <Button variant="danger" size="xs" onClick={handleOpenUnjoin}>
              Salir del evento
            </Button>
          </div>
          <DeleteModal
            open={openUnjoin}
            handleOpen={handleOpenUnjoin}
            handleDelete={() => {
              setOpenAlreadyIn(false)
              handleUnjoin(event.id)
            }}
            text={`
            Tus resultados aún seran visibles
            pero ya no podras participar en nuevas pruebas.

            ¿Salir de este evento?`}
            title="Salir del evento"
          ></DeleteModal>
        </div>
      </Modal>
    </div>
  )
}
