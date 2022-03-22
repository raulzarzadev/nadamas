import { acceptTeamRequest, } from '@/legasy/firebase/teams'
import { AddIcon } from '@/legasy/src/utils/Icons'
import Button from '@/legasy/src/components/inputs/Button'
import SearchAthletes from '@/legasy/src/components/inputs/SearchAthletes'
import Modal from '@/legasy/src/components/Modals/Modal'
import { useState } from 'react'
export default function AddMyOwnTeamMembers({teamId}) {
  const [openSearchModal, setOpenSearchModal] = useState(false)
  const handleOpenSearch = () => {
    setOpenSearchModal(!openSearchModal)
  }

  const handleAddMember = async (athleteId) => {
    await acceptTeamRequest(teamId, athleteId, true)
  }
  return (
    <div className="">
      <div className="flex justify-center items-center">
        <h4 className="mx-2 text-center font-bold">Agregar </h4>
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
          setAthlete={(athlete) => {
            handleAddMember(athlete.id)
            setTimeout(() => {
              handleOpenSearch()
            }, 400)
          }}
          label="Agregar atleta"
        />
      </Modal>
    </div>
  )
}
