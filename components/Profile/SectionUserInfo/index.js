import { getUser } from '@/firebase/users'
import { dateFormat } from '@/utils/dates'
import UserForm from '@comps/Forms/UserForm'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Loading from '@comps/Loading'
import Modal from '@comps/Modal'
import Section from '@comps/Section'
import AthleteTeamsSection from '@comps/Teams/AthleteTeamsSecttion'
import { useState, useEffect } from 'react'
import CoachSection from './CoachSection'

export default function SectionUserInfo({ userId }) {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    userId && getUser(userId).then(setUser)
  }, [])

  const {
    name,
    displayName,
    alias,
    birth,
    contact,
    email,
    phone,
    isCoach,
    medicInformation,
    emergencyContact
  } = user || {}


  const [openEditUser, setOpenEditUser] = useState(false)
  const handleOpenEditUser = () => {
    setOpenEditUser(!openEditUser)
  }

  if (!user) return <Loading />

  return (
    <div>
      {isCoach && <CoachSection user={user} />}
      <AthleteTeamsSection userId={userId} openSection={true} />
      <Section title={'Información personal'}>
        <div className="flex justify-center">
          <ButtonIcon
            label={'Editar'}
            iconName="edit"
            className="rounded-full "
            onClick={() => handleOpenEditUser()}
          />
        </div>
        <div className="text-center">
          {isCoach && (
            <div className="capitalize">
              <div>entrenador</div>
            </div>
          )}
          <div>{name || displayName}</div>
          <div>
            <span className="italic font-thin">{alias}</span>
          </div>
         {/*  <div>{birth}</div> */}
        </div>

        {openEditUser && (
          <Modal
            title="Editar usuario"
            open={openEditUser}
            handleOpen={handleOpenEditUser}
          >
            <UserForm user={user} />
          </Modal>
        )}

        <Section title="Contacto">
          <div>Telefono : {contact?.phone || phone}</div>
          <div>Correo: {contact?.email || email}</div>
        </Section>
        <Section title={'Información medica'}> Información médica</Section>
        <Section title={'Contacto emergencia '}>Contacto de emergencia</Section>
      </Section>
    </div>
  )
}
