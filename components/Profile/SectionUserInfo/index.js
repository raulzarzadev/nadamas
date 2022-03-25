import { getUser } from '@/firebase/users'
import { dateFormat } from '@/utils/dates'
import UserForm from '@comps/Forms/UserForm'
import Loading from '@comps/Loading'
import Modal from '@comps/Modal'
import Section from '@comps/Section'
import { useState, useEffect } from 'react'
export default function SectionUserInfo({ userId }) {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    userId && getUser(userId).then(setUser)
  }, [userId])

  const {
    name,
    displayName,
    alias,
    birth,
    phoneNumber,
    email,
    medicalInformation,
    emergencyContact
  } = user || {}
  const [openEditUser, setOpenEditUser] = useState(false)
  const handleOpenEditUser = () => {
    setOpenEditUser(!openEditUser)
  }

  if (!user) return <Loading />
  return (
    <div>
      <Section title={'Información personal'} indent={false}>
        <button className="btn" onClick={() => handleOpenEditUser()}>
          Editar
        </button>
        <div>
          <div>nombre : {name || displayName}</div>
          <div>fecha de nac:{dateFormat(birth, 'dd MMM yy')}</div>
          <div>email: {email}</div>
          <div>phone: {phoneNumber}</div>
          <div>alias: {alias}</div>
        </div>

        <Section title={'Información medica'}> Información médica</Section>
        <Section title={'Contacto emergencia '}>Contacto de emergencia</Section>

        <Modal
          title="Editar usuario"
          open={openEditUser}
          handleOpen={handleOpenEditUser}
        >
          <UserForm user={user} />
        </Modal>
      </Section>
    </div>
  )
}
