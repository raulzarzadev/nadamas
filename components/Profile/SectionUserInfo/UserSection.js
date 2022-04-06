import UserForm from '@comps/Forms/UserForm'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Modal from '@comps/Modal'
import Section from '@comps/Section'
import { useState } from 'react'

export default function UserSection({ user }) {
  const [openEditUser, setOpenEditUser] = useState(false)
  const handleOpenEditUser = () => {
    setOpenEditUser(!openEditUser)
  }

  const {
    isCoach,
    name,
    displayName,
    alias,
    contact,
    phone,
    email,
    medicInformation,
    emergencyContact,
    image
  } = user

  return (
    <Section title={'Información personal'}>
      <div className="flex justify-center">
        <ButtonIcon
          label={'Editar'}
          iconName="edit"
          className="rounded-full "
          onClick={() => handleOpenEditUser()}
        />
      </div>

      {image && (
        <div className='flex justify-center my-2'>
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img src={image} />
            </div>
          </div>
        </div>
      )}
      <div className="text-center">
        {isCoach && (
          <div className="capitalize">
            <div>entrenador</div>
          </div>
        )}
        <div>
          <h4>{name || displayName}</h4>
        </div>
        <div>
          <span className="italic font-thin">
            <h4>{alias}</h4>
          </span>
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
        <div>
          <h4>Telefono :</h4>
          <p className="font-bold text-center">{contact?.phone || phone}</p>
        </div>
        <div>
          <h4>Correo:</h4>
          <p className="font-bold text-center">{contact?.email || email}</p>
        </div>
      </Section>
      <Section title={'Información medica'}>
        <div>
          <h4>Tipo de sangre:</h4>
          <p className="font-bold text-center">
            {medicInformation?.blodType || 'sin'}
          </p>
        </div>
        <div>
          <h4>Concideraciones: *</h4>
          <p className="font-bold text-center">
            {medicInformation?.considerations || 'sin'}
          </p>
        </div>
      </Section>
      <Section title={'Contacto emergencia '}>
        <div>
          <h4>Parentesco:</h4>
          <p className="font-bold text-center">
            {emergencyContact?.relationship || 'sin'}
          </p>
        </div>
        <div>
          <h4>Nombre:</h4>
          <p className="font-bold text-center">
            {emergencyContact?.name || 'sin'}
          </p>
        </div>
        <div>
          <h4>Telefono:</h4>
          <p className="font-bold text-center">
            {emergencyContact?.phone || 'sin'}
          </p>
        </div>
      </Section>
    </Section>
  )
}
