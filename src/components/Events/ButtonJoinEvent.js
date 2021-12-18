import {
  athleteCancelEventRequest,
  athleteSendRequestEvent,
  athleteUnjoinEvent
} from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import { formatInputDate } from '@/src/utils/Dates'
import Button from '@comps/inputs/Button'
import MustBeAuthenticated from '@comps/MainLayout/PageErrors/MustBeAuthenticated'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { addDays, formatDistanceToNow } from 'date-fns'
import router from 'next/router'
import { useEffect, useState } from 'react'

export default function ButtonJoinEvent({ athleteId, event }) {
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(false)
  const [responseStatus, setResponseStatus] = useState(undefined)
  const [eventAthlete] = useState(
    event?.participants?.find(({ id }) => id == athleteId)
  )
  const { user } = useAuth()

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
    eventFinished: {
      type: 'EVENT_FINISHED',
      label: 'Evento finalizado. Ver resultados',
      buttonVariant: 'success',
      handleClick: () => {
        user
          ? router.push(ROUTES.events.results(event.id))
          : handleOpenMostBeAutenticated()
      }
    },
    alreadyIn: function (participant) {
      return {
        type: 'ALREDY_JOINED',
        label: `Eres el participante No.${participant?.number}`,
        handleClick: handleOpenAlreadyIn,
        buttonVariant: 'secondary'
      }
    }
  }

  const [openMustBeAutenticated, setOpenMostBeAutenticated] = useState(false)
  const handleOpenMostBeAutenticated = () => {
    console.log('ora')
    setOpenMostBeAutenticated(!openMustBeAutenticated)
  }

  const getRequestStatus = (athleteId, event) => {
    if (event?.requests?.includes(athleteId)) {
      return REQUEST_STATUS.whatingRes
    } else {
    }
    if (event.status === 'FINISH') return REQUEST_STATUS.eventFinished
    const participant = event?.participants?.find(({ id }) => id === athleteId)
    if (participant) {
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
    <div className="flex justify-center">
      {alert && (
        <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center z-10">
          <div className="bg-black border-2 rounded-2xl">{alert}</div>
        </div>
      )}
      <Button
        variant={responseStatus?.buttonVariant || 'primary'}
        loading={loading}
        onClick={async (e) => {
          e.stopPropagation()
          e.preventDefault()
          responseStatus?.handleClick(event.id)
        }}
        label={responseStatus?.label}
      />
      <Modal open={openMustBeAutenticated} handleOpen={handleOpenMostBeAutenticated} title='Autenticacón requerida'>
        <MustBeAuthenticated />
      </Modal>
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
