import useAthlete from '@/legasy/src/hooks/useAthlete'
import { formatInputDate, getAge } from '@/legasy/src/utils/Dates'
import {
  ContactIcon,
  EditIcon,
  EmergencyIcon,
  TrashBinIcon
} from '@/legasy/src/utils/Icons'
import Button from '@/legasy/src/components/inputs/Button'
import Loading from '@/components/Loading'
import DeleteModal from '@/legasy/src/components/Modals/DeleteModal'
import EmergencyCallModal from '@/legasy/src/components/Modals/EmergencyCallModal'
import MemberRow from '@/legasy/src/components/Teams/MemberRow'
import { useState } from 'react'
import AthleteRow from '..'

export default function ParticipantsRows({
  athletesIds,
  handleRemoveMember = (athleteId) => {}
}) {
  return (
    <div className="">
      {!athletesIds?.length && 'No hay participantes aún'}
      <div className="flex w-full justify-between">
        <div className="font-bold w-1/12">No.</div>
        <div className="font-bold w-1/4">Nombre</div>
        <div className="font-bold w-1/6">Edad</div>
        <div className="font-bold w-1/3">Opciones</div>
      </div>
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
  return (
    <div>
      <div
        key={athlete.id}
        className="flex items-center w-full justify-between"
      >
        <div className=" w-1/12 text-right">
          <span className="ml-1 font-bold text-lg ">{athleteId.number} </span>
        </div>
        {athlete.active ? (
          <>
            <div className=" flex w-1/4 justify-start">
              {`${athlete?.name?.split(' ')?.[0] || ''} `}{' '}
            </div>
            <div className=" flex w-1/6 justify-evenly">
              {`${getAge(athlete?.birth)?.split(' ')[0]}`}{' '}
            </div>

            <div className=" flex w-1/3 justify-evenly ">
              <Button
                variant="danger"
                onClick={handleOpenDelete}
                iconOnly
                size="xs"
              >
                <TrashBinIcon size="1rem" />
              </Button>
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
