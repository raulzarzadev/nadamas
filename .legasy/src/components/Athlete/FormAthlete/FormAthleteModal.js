import useAthlete from '@/legasy/src/hooks/useAthlete'
import { format } from '@/legasy/src/utils/Dates'
import Button from '@/legasy/src/components/inputs/Button'
import Loading from '@/components/Loading'
import Modal from '@/legasy/src/components/Modals/Modal'
import { useState } from 'react'
import FormAthlete from '.'

export default function FormAthleteModal ({ athleteId }) {


  const [openAthleteForm, setOpenAthleteForm] = useState()
  const handleOpenAthleteForm = () => {
    setOpenAthleteForm(!openAthleteForm)
  }



  return (
    <div className="m-2">
      <Info athleteId={ athleteId } />
      <div className="flex flex-col justify-center items-center">
        <Button
          variant="success"
          label="editar perfil"
          noWrapText
          onClick={ handleOpenAthleteForm }
        />
      </div>
      <Modal
        open={ openAthleteForm }
        handleOpen={ handleOpenAthleteForm }
        title="Editar atleta"
      >
        <FormAthlete athleteId={ athleteId } />
      </Modal>
    </div>
  )
}

const Info = ({ athleteId }) => {

  const {
    athlete
  } = useAthlete(athleteId)
  if (!athlete) return <Loading />

  const { name, email, birth, goals, blodType, mobile, lastName } = athlete

  return (
    <div className=" flex flex-col justify-center items-center">
      <div>
        { name } { lastName }
      </div>
      <div>{ email }</div>
      <div>{ format(birth, 'dd MMM yy') }</div>
      <div>{ mobile }</div>
      <div>{ blodType }</div>
    </div>
  )
}
