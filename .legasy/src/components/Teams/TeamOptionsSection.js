import { unjoinTeam } from '@/legasy/firebase/teams'
import { useAuth } from '@/legasy/src/context/AuthContext'
import useTeams from '@/legasy/src/hooks/useTeams'
import { TrashBinIcon } from '@/legasy/src/utils/Icons'
import Button from '@/legasy/src/components/inputs/Button'
import DeleteModal from '@/legasy/src/components/Modals/DeleteModal'
import Section from '@/legasy/src/components/Section'
import { useRouter } from 'next/router'
import { useState } from 'react'

export default function TeamOptionsSection({ team }) {
  const { teamOwner } = useTeams({ team })
  const { user } = useAuth()
  const router = useRouter()
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
