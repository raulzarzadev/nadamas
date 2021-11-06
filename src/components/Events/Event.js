import {
  athleteCancelEventRequest,
  athleteJoinEvent,
  athleteUnjoinEvent,
  getEvent,
  removeEvent
} from '@/firebase/events'
import { useAuth } from '@/src/context/AuthContext'
import { formatInputDate } from '@/src/utils/Dates'
import Info from '@comps/Alerts/Info'
import ParticipantsRows from '@comps/AthleteRow/ParticipantsRows'
import RequestRows from '@comps/AthleteRow/RequestRows'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import DeleteModal from '@comps/Modals/DeleteModal'
import Section from '@comps/Section'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ButtonJoinEvent from './ButtonJoinEvent'
import FormEvent from './FormEvent'
import Image from 'next/image'
export default function Event() {
  const { user } = useAuth()
  const [event, setEvent] = useState(undefined)
  const router = useRouter()
  const {
    query: { id: eventId }
  } = router
  useEffect(() => {
    if (eventId)
      getEvent(eventId)
        .then(setEvent)
        .catch((err) => console.log(`err`, err))
  }, [eventId])

  const [isEditable, setIsEditable] = useState(false)
  const handleSetEditable = () => {
    setIsEditable(!isEditable)
  }
  const handleDiscard = () => {
    handleSetEditable()
  }
  if (!event) return <Loading />
  return (
    <>
      {isEditable ? (
        <FormEvent event={event} discard={handleDiscard} />
      ) : (
        <>
          <div className="max-w-sm mx-auto py-4 text-center">
            <EventDetails event={event} />

            <ButtonJoinEvent
              event={event}
              athleteId={user?.athleteId}
              eventId={event?.id}
            />
            {user?.id === event?.owner?.id && (
              <ManageEvent
                handleSetEditable={handleSetEditable}
                event={event}
              />
            )}
            <Section title="Resultados" open>
              <Info text="Aún no hay resultados " />
            </Section>
          </div>
        </>
      )}
    </>
  )
}

const EventDetails = ({ event }) => {
  return (
    <>
      <div className="relative w-full h-20">
        {event?.image && (
          <Image src={event?.image} layout="fill" objectFit="cover" />
        )}
      </div>
      <h3 className="font-bold my-2">{event?.title}</h3>
      <h3 className="text-xl my-2">
        {formatInputDate(event?.date, 'dd MMMM yyyy')}
      </h3>
      <div>{event?.description}</div>
    </>
  )
}
const ManageEvent = ({ handleSetEditable, event }) => {
  const [openDelete, setOpenDelete] = useState(false)

  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const handleDelete = () => {
    removeEvent(event.id)
      .then((res) => {
        back()
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  const handleAccepRequest = (athleteId) => {
    athleteJoinEvent(event.id, athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  const handleRejectRequest = (athleteId) => {
    athleteCancelEventRequest(event.id, athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  const handleRemoveMember = (athleteId) => {
    athleteUnjoinEvent(event.id, athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  return (
    <div>
      <Button label="Editar" variant="secondary" onClick={handleSetEditable} />
      <Button
        label="Eliminar evento"
        variant="danger"
        onClick={handleOpenDelete}
      />
      <DeleteModal
        text="Eliminar este evento de forma permanente"
        handleOpen={handleOpenDelete}
        open={openDelete}
        handleDelete={handleDelete}
      />
      <Section title="Estadisticas">
        <Section title="Pruebas"></Section>
        <Section title={`Participantes (${event?.participants?.length || 0})`}>
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
    </div>
  )
}
