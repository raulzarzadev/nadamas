import { unjoinTeam } from '@/firebase/teams'
import { useAuth } from '@/src/context/AuthContext'
import useTeams from '@/src/hooks/useTeams'
import { TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import Section from '@comps/Section'
import { useRouter } from 'next/router'
import { useState } from 'react'

export default function TeamOptionsSection({ team }) {
  const { teamOwner } = useTeams({ team })
  const { user } = useAuth()
  const router = useRouter()
  console.log(user)
  const handleDeleteTeam = () => {
    removeTeam(team.id)
      .then((res) => {
        console.log(`res`, res)
        replace('/teams')
      })
      .catch((err) => console.log(`err`, err))
  }

  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }

  const handleUnjoinTeam = () => {
    unjoinTeam(team.id, user?.athleteId)
      .then((res) => {
        console.log(`res`, res)
        router.replace('/teams')
      })
      .catch((err) => console.log(`err`, err))
  }
  return (
    <Section title="Opciones">
      {teamOwner && (
        <div className="py-4 w-full flex justify-center items-center">
          <Button
            label="Eliminar"
            variant="danger"
            size="xl"
            onClick={handleOpenDelete}
          >
            Eliminar
            <TrashBinIcon size="2rem" />
          </Button>
          <DeleteModal
            open={openDelete}
            text="Elimar este equipo de forma permanente"
            handleDelete={handleDeleteTeam}
            handleOpen={handleOpenDelete}
          ></DeleteModal>
        </div>
      )}
      <Button
        label="Eliminar"
        variant="outlined"
        size="xl"
        onClick={handleUnjoinTeam}
      >
        Salir
      </Button>
    </Section>
  )
}
