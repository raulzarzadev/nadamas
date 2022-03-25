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
    contact,
    email,
    phone,
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
      <Section title={'Información personal'} indent={false}>
        <button className="btn" onClick={() => handleOpenEditUser()}>
          Editar
        </button>
        <div className="text-center">
          <div>{name || displayName}</div>
          <div>
            <span className="italic font-thin">{alias}</span>
          </div>
          <div>{dateFormat(birth, 'dd MMM yy')}</div>
        </div>
        <Section title="Contacto" indent={false}>
          <div>Telefono : {contact?.phone || phone}</div>
          <div>Correo: {contact?.email || email}</div>
        </Section>
        <Section title={'Información medica'} indent={false}>
          {' '}
          Información médica
        </Section>
        <Section title={'Contacto emergencia '} indent={false}>
          Contacto de emergencia
        </Section>

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
