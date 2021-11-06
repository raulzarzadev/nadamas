import { getAthlete, getAthleteId } from "@/firebase/athletes"
import { TrashBinIcon } from "@/src/utils/Icons"
import AthleteRow from "@comps/AthleteRow"
import Button from "@comps/inputs/Button"
import Loading from "@comps/Loading"
import DeleteModal from "@comps/Modals/DeleteModal"
import { useEffect, useState } from "react"

const MemberRow = ({ athlete, handleRemoveMember }) => {
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const [athleteInfo, setAthleteInfo] = useState(undefined)
  useEffect(() => {
    if (athlete) {
      getAthleteId(athlete)
        .then((res) => {
          console.log(`res`, res)
          if (res) {
            setAthleteInfo(res)
          } else {
            setAthleteInfo({ id: athlete, active: false })
          }
        })
        .catch((err) => console.log(`err`, err))
      return () => {
        setAthleteInfo(undefined)
      }
    }
  }, [athlete])
  console.log(`athlete`, athlete)
  if (athleteInfo === undefined) return <Loading />
  return (
    <div>
      <div key={athlete.id} className="flex items-center w-full">
        <Button
          variant="danger"
          className="ml-2 py-1"
          onClick={handleOpenDelete}
          iconOnly
          size="xs"
        >
          <TrashBinIcon size="1rem" />
        </Button>
        {athleteInfo.active ? (
          <AthleteRow athlete={athleteInfo} />
        ) : (
          <div className="p-2">Usuario inactivo</div>
        )}

        <DeleteModal
          text="Sacar del equipo a"
          title="Descartar atleta"
          open={openDelete}
          handleOpen={handleOpenDelete}
          name={`${athleteInfo?.name} ${athleteInfo?.lastName}`}
          handleDelete={() => {
            handleRemoveMember(athleteInfo.id)
            handleOpenDelete()
          }}
        />
      </div>
    </div>
  )
}
export default MemberRow
