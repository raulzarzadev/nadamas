import {
  athleteAcceptRequestEvent,
  athleteCancelEventRequest,
  athleteUnjoinEvent,
  getEvent,
  removeEvent
} from '@/firebase/events'
import { useAuth } from '@/src/context/AuthContext'
import { formatInputDate } from '@/src/utils/Dates'
import ParticipantsRows from '@comps/AthleteRow/ParticipantsRows'
import RequestRows from '@comps/AthleteRow/RequestRows'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import DeleteModal from '@comps/Modals/DeleteModal'
import Section from '@comps/Section'
import router, { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ButtonJoinEvent from './ButtonJoinEvent'
import Image from 'next/image'
import { ROUTES } from '@/ROUTES'
import TestsPicker from '@comps/inputs/PickerTests'
import MustBeAuthenticated from '@comps/MainLayout/PageErrors/MustBeAuthenticated'
export default function Event() {
  const { user } = useAuth()
  const [event, setEvent] = useState(undefined)
  const router = useRouter()
  const {
    query: { id: eventId }
  } = router
  useEffect(() => {
    if (eventId)
      getEvent(eventId, (res) => {
        setEvent(res)
      })
    /* .then(setEvent)
        .catch((err) => console.log(`err`, err)) */
  }, [eventId])

  const isOwner = user?.id === event?.owner?.id
  const handleClickResults = () => {
    router.push(ROUTES.events.results(eventId))
  }
  if (!user) return <MustBeAuthenticated />
  if (!event) return <Loading size="lg" />
  return (
    <>
      <div className="max-w-sm mx-auto text-center">
        <EventDetails
          event={event}
          isOwner={isOwner}
          athleteId={user?.athleteId}
        />
      </div>
    </>
  )
}

const EventDetails = ({ event, isOwner, athleteId }) => {
  return (
    <>
      {event?.image && (
        <div className="relative w-full h-32">
          <Image src={event?.image} layout="fill" objectFit="cover" />
          {event.status === 'FINISH' && <EventFinishedBadge />}
        </div>
      )}
      <h3 className="font-bold my-2">{event?.title}</h3>
      <h3 className="text-xl my-2">
        {formatInputDate(event?.date, 'dd MMMM yyyy')}
      </h3>

      {isOwner && (
        <div className="m-2 shadow-lg p-1 bg-secondary rounded-md">
          <AdminActions eventId={event.id} />
          <ManageEvent event={event} />
        </div>
      )}
      <ButtonJoinEvent event={event} athleteId={athleteId} />
      <div>
        <h3>Pruebas {` (${event?.tests?.length || 0})`}</h3>
        <TestsPicker tests={event?.tests} disabled={true} />
      </div>
      <p className="whitespace-pre-wrap text-left p-2">{event?.description}</p>

      <div className="py-4">
        {event?.announcement && (
          <div>
            <div className="m-3">
              Descargar{' '}
              <a
                className="hover:to-blue-200 font-bold underline"
                href={event.announcement}
                download={`convocatoria ${event?.title}`}
              >
                convocatoria
              </a>
            </div>
            <embed src={event.announcement} className="w-5/6 mx-auto h-96" />
          </div>
        )}
      </div>
    </>
  )
}

const AdminActions = ({ eventId }) => {
  const [openDelete, setOpenDelete] = useState(false)

  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const handleDelete = () => {
    removeEvent(eventId)
      .then((res) => {
        router.back()
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleClickResults = () => {
    router.push(ROUTES.events.results(eventId))
  }

  const handleEdit = () => {
    router.push(ROUTES.events.edit(eventId))
  }

  return (
    <div className="grid gap-2">
      <Button
        label="Eliminar"
        variant="danger"
        onClick={handleOpenDelete}
        fullWidth
      />
      <Button label="Editar" variant="primary" onClick={handleEdit} fullWidth />
      <Button
        variant="success"
        label="Ver resultados"
        onClick={handleClickResults}
        fullWidth
      />

      <DeleteModal
        text={`
        Tambien se eliminaran los resultados y estadisitcas. 
        Pero cada athleta conservara sus marcas personales
        
        ¿Eliminar este evento de forma permanente?
        `}
        handleOpen={handleOpenDelete}
        open={openDelete}
        handleDelete={handleDelete}
      />
    </div>
  )
}
const ManageEvent = ({ event }) => {
  const handleAccepRequest = (athleteId) => {
    athleteAcceptRequestEvent(event.id, athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  const handleRejectRequest = (athleteId) => {
    athleteCancelEventRequest(event.id, athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  const handleRemoveMember = (eventAthlete) => {
    athleteUnjoinEvent(event.id, eventAthlete)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }

  return (
    <>
      <Section
        title={`Participantes (${event?.participants?.length || 0})`}
        indent={false}
      >
        <ParticipantsRows
          athletesIds={event?.participants}
          handleRemoveMember={handleRemoveMember}
        />
      </Section>
      <Section
        title={`Solicitudes (${event?.requests?.length || 0})`}
        indent={false}
      >
        <RequestRows
          athletesIds={event?.requests}
          onAcceptRequest={handleAccepRequest}
          onRejectRequest={handleRejectRequest}
        />
      </Section>
    </>
  )
}

const EventFinishedBadge = ({ event }) => {
  return (
    <div className="relative bg-secondary transform rotate-12 top-12 rounded-full">
      <h3 className="text-4xl font-bold">Evento Finalizado</h3>
    </div>
  )
}
