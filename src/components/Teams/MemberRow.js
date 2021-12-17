import { getAthlete, getAthleteId } from '@/firebase/athletes'
import useAthlete from '@/src/hooks/useAthlete'
import { TrashBinIcon } from '@/src/utils/Icons'
import AthleteRow from '@comps/AthleteRow'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import DeleteModal from '@comps/Modals/DeleteModal'
import { useEffect, useState } from 'react'

const MemberRow = ({
  athlete: athleteId,
  handleRemoveMember,
  coachView = true
}) => {
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const { athlete } = useAthlete(athleteId)
  if (athlete === undefined) return <Loading />
  return (
    <div>
      <div key={athlete.id} className="flex items-center w-full">
        {coachView && (
          <Button
            variant="danger"
            className="ml-2 py-1"
            onClick={handleOpenDelete}
            iconOnly
            size="xs"
          >
            <TrashBinIcon size="1rem" />
          </Button>
        )}
        {athlete.active ? (
          <AthleteRow athlete={athlete} coachView={coachView} groupView/>
        ) : (
          <div className="p-2">Usuario inactivo</div>
        )}

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
