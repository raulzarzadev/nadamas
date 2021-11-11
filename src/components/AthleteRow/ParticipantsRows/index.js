import useAthlete from '@/src/hooks/useAthlete'
import { formatInputDate, getAge } from '@/src/utils/Dates'
import {
  ContactIcon,
  EditIcon,
  EmergencyIcon,
  TrashBinIcon
} from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import DeleteModal from '@comps/Modals/DeleteModal'
import EmergencyCallModal from '@comps/Modals/EmergencyCallModal'
import MemberRow from '@comps/Teams/MemberRow'
import { useState } from 'react'
import AthleteRow from '..'

export default function ParticipantsRows({
  athletesIds,
  handleRemoveMember = (athleteId) => {}
}) {
  return (
    <div className="">
      {!athletesIds?.length && 'No hay participantes aún'}
      {athletesIds?.map((athlete) => (
        <Row
          key={athlete.id}
          athlete={athlete}
          handleRemoveMember={handleRemoveMember}
        />
      ))}
    </div>
  )
}

const Row = ({ athlete: athleteId, handleRemoveMember }) => {
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const { athlete } = useAthlete(athleteId.id)
  const [openEmergencyModal, setOpenEmergencyModal] = useState()
  const handleOpenEmergencyCall = () => {
    setOpenEmergencyModal(!openEmergencyModal)
  }
  if (athlete === undefined) return <Loading />
  console.log(`athlete.id`,athlete, athlete.id)
  return (
    <div>
      <div
        key={athlete.id}
        className="flex items-center w-full justify-between"
      >
        <Button
          variant="danger"
          className="ml-2 py-1"
          onClick={handleOpenDelete}
          iconOnly
          size="xs"
        >
          <TrashBinIcon size="1rem" />
        </Button>
        <div className="text-xs mx-1">
          No.<span className="ml-1 font-bold text-lg">{athleteId.number} </span>
        </div>
        {athlete.active ? (
          <>
            <div>{`${athlete?.name} ${athlete?.lastName || ''}`} </div>
            <div>{`${getAge(athlete?.birth)?.split(' ')[0]}`} </div>

            <div className="m-1 flex w-1/4 justify-evenly ">
              <Button
                size="sm"
                disabled={!athlete?.emerMobile}
                onClick={handleOpenEmergencyCall}
                iconOnly
              >
                <EmergencyIcon size="1rem" className="text-red-500" />
              </Button>
              <Button
                size="sm"
                disabled={!athlete?.mobile}
                href={`https://wa.me/521${athlete?.mobile}?text=${athlete?.wstext}`}
                iconOnly
              >
                <ContactIcon size="1rem" />
              </Button>
            </div>
            <EmergencyCallModal
              handleOpen={handleOpenEmergencyCall}
              open={openEmergencyModal}
              contact={athlete}
            />
          </>
        ) : (
          <div className="p-2">Usuario inactivo</div>
        )}

        <DeleteModal
          text="Retirar de la competencia"
          title="Descartar atleta"
          open={openDelete}
          handleOpen={handleOpenDelete}
          name={`${athlete?.name} ${athlete?.lastName || ''}`}
          handleDelete={() => {
            handleRemoveMember(athleteId)
            handleOpenDelete()
          }}
        />
      </div>
    </div>
  )
}
