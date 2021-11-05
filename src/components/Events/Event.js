import { getEvent, removeEvent } from '@/firebase/events'
import { ROUTES } from '@/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import { format, formatInputDate } from '@/src/utils/Dates'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ButtonJoinEvent from './ButtonJoinEvent'
import FormEvent from './FormEvent'

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
  const [athleteId, setAthleteId] = useState(undefined)
  useEffect(() => {
    setAthleteId(user?.athleteId)
  }, [])
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const handleDelete = () => {
    const {
      query: { id: eventId },
      back
    } = router
    removeEvent(eventId)
      .then((res) => {
        back()
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  const [isEditable, setIsEditable] = useState(false)
  const handleSetEditable = () => {
    setIsEditable(!isEditable)
  }
  const handleDiscard = () => {
    handleSetEditable()
  }
  return (
    <>
      {isEditable ? (
        <FormEvent event={event} discard={handleDiscard} />
      ) : (
        <>
          <div className="max-w-sm mx-auto py-4 text-center">
            <h3 className="font-bold my-2">{event?.title}</h3>
            <h3 className="text-xl my-2">
              {formatInputDate(event?.date, 'dd MMMM yyyy')}
            </h3>
            <div>{event?.description}</div>
            <ButtonJoinEvent athleteId={athleteId} eventId={event?.id} />
            <Button
              label="Eliminar evento"
              variant="danger"
              onClick={handleOpenDelete}
            />
            {user?.id === event?.owner?.id}
            <Button
              label="Editar"
              variant="secondary"
              onClick={handleSetEditable}
            />
            <DeleteModal
              text="Eliminar este evento de forma permanente"
              handleOpen={handleOpenDelete}
              open={openDelete}
              handleDelete={handleDelete}
            />
          </div>
        </>
      )}
    </>
  )
}
{
  /* <div className="max-w-sm mx-auto py-4 text-center">
      <div>{format(event?.date, 'dd MMM yy')}</div>
      <div>{event?.title}</div>
      <div>{event?.description}</div>
      <ButtonJoinEvent athleteId={athleteId} eventId={event?.id} />
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
      </div>
    */
}
