import {
  athleteAcceptRequestEvent,
  athleteCancelEventRequest,
  athleteUnjoinEvent,
  getEvent,
  removeEvent
} from '@/legasy/firebase/events'
import { useAuth } from '@/legasy/src/context/AuthContext'
import { formatInputDate } from '@/legasy/src/utils/Dates'
import ParticipantsRows from '@/legasy/src/components/AthleteRow/ParticipantsRows'
import RequestRows from '@/legasy/src/components/AthleteRow/RequestRows'
import Button from '@/legasy/src/components/inputs/Button'
import Loading from '@/components/Loading'
import DeleteModal from '@/legasy/src/components/Modals/DeleteModal'
import Section from '@/legasy/src/components/Section'
import router, { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ButtonJoinEvent from './ButtonJoinEvent'
import Image from 'next/image'
import { ROUTES } from '@/legasy/ROUTES'
import TestsPicker from '@/legasy/src/components/inputs/PickerTests'
import MustBeAuthenticated from '@/legasy/src/components/MainLayout/PageErrors/MustBeAuthenticated'
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
  }, [eventId])

  const isOwner = user?.id === event?.owner?.id
  const handleClickResults = () => {
    router.push(ROUTES.events.results(eventId))
  }
  if (!user) return <MustBeAuthenticated />
  if (!event) return <Loading size="lg" />
  return (
    <>
      <div className="max-w-sm mx-auto py-4 text-center">
        <div className="grid grid-flow-row gap-3 sm:grid-flow-col items-center py-3 sticky top-0 z-10 bg-gray-700">
          {isOwner ? (
            <AdminActions eventId={event.id} />
          ) : (
            <>
              <Button
                label="ver resultados"
                onClick={handleClickResults}
                variant="secondary"
              />
              <ButtonJoinEvent event={event} athleteId={user?.athleteId} />
            </>
          )}
        </div>
        {isOwner && <ManageEvent event={event} />}
        <EventDetails event={event} />
      </div>
    </>
  )
}

const EventDetails = ({ event }) => {
  return (
    <>
      {event?.image && (
        <div className="relative w-full h-20">
          <Image src={event?.image} layout="fill" objectFit="cover" priority />
        </div>
      )}
      {event.status === 'FINISH' && <EventFinished event={event} />}
      <h3 className="font-bold my-2">{event?.title}</h3>
      <h3 className="text-xl my-2">
        {formatInputDate(event?.date, 'dd MMMM yyyy')}
      </h3>
      <p className="whitespace-pre-wrap text-left p-2">{event?.description}</p>

      <div>
        <h3>Pruebas {` (${event?.tests?.length || 0})`}</h3>
        <TestsPicker tests={event?.tests} disabled={true} />
      </div>

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
        back()
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
    <>
      <Button label="Eliminar" variant="danger" onClick={handleOpenDelete} />
      <Button label="Editar" variant="secondary" onClick={handleEdit} />
      <Button label="Ver resultados" onClick={handleClickResults} />

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
    </>
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
      <Section title="Administración" open indent={false}>
        <Section
          title={`Participantes (${event?.participants?.length || 0})`}
          indent={false}
        >
          <ParticipantsRows
            athletesIds={event?.participants}
            handleRemoveMember={handleRemoveMember}
          />
        </Section>
        <Section title={`Solicitudes (${event?.requests?.length || 0})`}>
          <RequestRows
            athletesIds={event?.requests}
            onAcceptRequest={handleAccepRequest}
            onRejectRequest={handleRejectRequest}
          />
        </Section>
      </Section>
    </>
  )
}

export const EventFinished = ({ event }) => {
  const router = useRouter()
  const handleClickResults = () => {
    router.push(ROUTES.events.results(event.id))
  }
  return (
    <div>
      <div>
        <h3 className="relative -top-10 text-4xl font-bold my-4 bg-purple-500 transform rotate-12">
          Evento Finalizado
        </h3>
      </div>
      <Button label="Ver resultados" onClick={handleClickResults} />
    </div>
  )
}
