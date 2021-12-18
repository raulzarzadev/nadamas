import { getAthlete, getAthleteId } from '@/firebase/athletes'
import { assignAsCoach, removeAsCoach } from '@/firebase/teams'
import useAthlete from '@/src/hooks/useAthlete'
import { CoachIcon, InfoIcon, TrashBinIcon } from '@/src/utils/Icons'
import AthleteRow from '@comps/AthleteRow'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { useEffect, useState } from 'react'

const MemberRow = ({
  athlete: athleteId,
  handleRemoveMember,
  teamCoaches,
  coachView = true,
  teamId
}) => {
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const [openOptions, setOpenOptions] = useState(false)
  const handleOpenOptions = () => {
    setOpenOptions(!openOptions)
  }
  const { athlete } = useAthlete(athleteId)
  const handleAssignAsCoach = (athleteId) => {
    assignAsCoach(teamId, athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  const handleRemoveAsCoach = (athleteId) => {
    removeAsCoach(teamId, athleteId)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  const isATeamCoach = teamCoaches?.includes(athleteId)
  if (athlete === undefined) return <Loading />
  return (
    <div>
      <div key={athlete.id} className="flex items-center w-full">
        {coachView && (
          <>
            <Button
              className="ml-2 py-1"
              onClick={handleOpenOptions}
              iconOnly
              size="xs"
            >
              <InfoIcon size="1rem" />
            </Button>
          </>
        )}
        {athlete.active ? (
          <AthleteRow athlete={athlete} coachView={coachView} groupView />
        ) : (
          <div className="p-2">Usuario inactivo</div>
        )}

        <Modal
          open={openOptions}
          handleOpen={handleOpenOptions}
          title="Opciones"
        >
          <div className="grid place-content-center gap-2 w-full">
            {isATeamCoach ? (
              <Button
                onClick={() => handleRemoveAsCoach(athleteId)}
                size="sm"
                noWrapText
                fullWidth
              >
                Remover como entrenador
                <CoachIcon size="1rem" />
              </Button>
            ) : (
              <Button
                onClick={() => handleAssignAsCoach(athleteId)}
                size="sm"
                noWrapText
                fullWidth
              >
                Entrenador
                <CoachIcon size="1rem" />
              </Button>
            )}
            <Button
              variant="danger"
              className="ml-2 py-1"
              onClick={handleOpenDelete}
              size="sm"
              noWrapText
              fullWidth
            >
              <span>Sacar del equipo</span> <TrashBinIcon size="1rem" />
            </Button>
          </div>
        </Modal>

        <DeleteModal
          text="Sacar del equipo a"
          title="Descartar atleta"
          open={openDelete}
          handleOpen={handleOpenDelete}
          name={`${athlete?.name} ${athlete?.lastName}`}
          handleDelete={() => {
            handleRemoveMember(athleteId)
            handleOpenDelete()
          }}
        />
      </div>
    </div>
  )
}
export default MemberRow
