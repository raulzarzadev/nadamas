import Payments from '@/pages/payments'
import Records from '@/pages/records'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import AthleteSchedule from '@comps/Schedules/AthleteSchedule'
import Section from '@comps/Section'
import { useRouter } from 'next/router'
import { useState } from 'react'
import AthleteStatistics from '../AthleteStatistics'
import AthleteTeam from '../AthleteTeam'

export default function SectionAthleteAlreadyExist({ athleteId }) {
  const router = useRouter()
  const handleDelete = () => {
    removeAthlete(athleteId)
      .then((res) => {
        console.log(`res`, res)
        setTimeout(() => {
          router.back()
        }, 400)
      })
      .catch((err) => console.log(`err`, err))
  }
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  return (
    <>
      {/* ----------------------------------------------TEAMS AND GROUPS */}
      <Section title={'Equipos'} indent={false}>
        <AthleteTeam athleteId={athleteId} />
      </Section>
      {/* ----------------------------------------------ESTADISITCAS */}
      <Section title={'Estadisticas'} indent={false}>
        <AthleteStatistics athleteId={athleteId} />
      </Section>

      {/* ----------------------------------------------Tests */}
      <Section title={'Pruebas'} indent={false}>
        <Records athleteId={athleteId} />
      </Section>

      {/* ----------------------------------------------Pyments */}
      <Section title="Cuotas" indent={false}>
        <Payments athleteId={athleteId} />
      </Section>

      {/* ----------------------------------------------Schedule */}
      <Section title={'Horario'} indent={false}>
        <AthleteSchedule athleteId={athleteId} />
      </Section>

      {/* ---------------------------------------------- Options */}
      <Section title={'Opciones'} indent={false}>
        <div className="p-4  mx-auto mt-10 ">
          <Button variant="danger" onClick={handleOpenDelete}>
            Eliminar Atleta
          </Button>
        </div>
      </Section>
      <DeleteModal
        open={openDelete}
        handleDelete={handleDelete}
        name={''}
        handleOpen={handleOpenDelete}
      />
    </>
  )
}
