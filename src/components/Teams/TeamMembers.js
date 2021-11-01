import { getAthlete } from '@/firebase/athletes'
import { acceptTeamRequest, unjoinTeam } from '@/firebase/teams'
import { AddIcon, TrashBinIcon } from '@/src/utils/Icons'
import AthleteRow from '@comps/AthleteRow'
import Button from '@comps/inputs/Button'
import SearchAthletes from '@comps/inputs/SearchAthletes'
import Loading from '@comps/Loading'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { useEffect, useState } from 'react'

export default function TeamMembers({
  members = [],
  setMembers = (arr) => {},
  teamId
}) {
  const [openSearchModal, setOpenSearchModal] = useState(false)
  const handleOpenSearch = () => {
    setOpenSearchModal(!openSearchModal)
  }

  const handleAddMember = async (athleteId) => {
    await acceptTeamRequest(teamId, athleteId, true)
    setMembers([...members, athleteId])
  }
  const handleRemoveMember = async (athleteId) => {
    await unjoinTeam(teamId, athleteId)
    const newList = members.filter((id) => id !== athleteId)
    setMembers([...newList])
  }

  return (
    <>
      <div className="flex justify-center items-center">
        <h4 className="p-2 text-center font-bold">Integrantes </h4>
        <Button iconOnly size="xs" onClick={handleOpenSearch}>
          <AddIcon />
        </Button>
      </div>

      <Modal
        open={openSearchModal}
        handleOpen={handleOpenSearch}
        title="Nuevo integrante"
      >
        <SearchAthletes
          AthleteRowResponse={AthleteResponse}
          setAthlete={(athlete) => {
            handleAddMember(athlete.id)
            setTimeout(() => {
              handleOpenSearch()
            }, 400)
          }}
          label="Agregar atleta"
        />
      </Modal>
      <div className="p-2 max-w-md mx-auto">
        {members?.map((memberId, i) => (
          <MemberRow
            key={memberId}
            athlete={memberId}
            handleRemoveMember={handleRemoveMember}
          />
        ))}
      </div>
    </>
  )
}

const MemberRow = ({ athlete, handleRemoveMember }) => {
  console.log(`athlete`, athlete)
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const [athleteInfo, setAthleteInfo] = useState(undefined)
  useEffect(() => {
    if (athlete) {
      getAthlete(athlete)
        .then(setAthleteInfo)
        .catch((err) => console.log(`err`, err))
      return () => {
        setAthleteInfo(undefined)
      }
    }
  }, [athlete])
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
        <AthleteRow athlete={athleteInfo} />
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

const AthleteResponse = ({ athlete, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="my-2"
    >{`${athlete.name} ${athlete.lastName}`}</div>
  )
}
