import { useState, useEffect } from 'react'
import { getTeamMember } from '@/firebase/users'
import Loading from '@comps/Loading'
import { useUser } from '@/context/UserContext'
import Button from '@comps/Inputs/Button'
import { acceptRequest } from '@/firebase/teams'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Link from '@comps/Link'
import Icon from '@comps/Icon'
import Modal from '@comps/Modal'
import { dateFormat } from '@/utils/dates'

export default function TeamMember({
  memberId,
  team,
  isRequestRow,
  isTeamRow
}) {
  const { user } = useUser()
  const [member, setMember] = useState()
  useEffect(() => {
    getTeamMember(memberId).then(setMember)
  }, [])

  const [openmemberModal, setOpenmemberModal] = useState()
  const handleOpenmemberModal = () => {
    setOpenmemberModal(!openmemberModal)
  }

  if (!member) return <Loading />

  const {
    name,
    photoURL: image,
    joinedAt,
    contact,
    email,
    alias,
    emergencyContact,
    medicInformation,
    birth
  } = member

  const itsMe = member.id === user.id

  const isOwner = [team.userId, team?.coach?.id].includes(user.id)

  const handleAcceptRequest = () => {
    acceptRequest(team.id, memberId).then((res) => {
      console.log(res)
    })
  }

  const emailCC = null
  const subject = 'Infomación relevante de nadamas'

  return (
    <>
      <div
        className=" bg-base-300 p-1 rounded-lg shadow-lg w-full"
        onClick={() => handleOpenmemberModal()}
      >
        <div className=" flex justify-around">
          <div className="flex w-full  items-center">
            <div className="avatar">
              <div className="w-10 rounded-full">
                <img src={image} />
              </div>
            </div>
            <div>
              <h4 className=" ml-1">
                {name}
                <span className="text-xs font-thin ">{itsMe && ' (Tú)'}</span>
                {/* <span className="font-thin text-sm">
              
            </span> */}
                {/* <span className="text-xs font-thin mx-2">
              {team?.isPublic ? 'Público' : 'Privado'}
            </span> */}
              </h4>
              <p className="font-thin text-sm hidden sm:block">{email}</p>
            </div>
          </div>

          {/* -------------------------------------------------------------------- Quick actions buttons  */}
          {isTeamRow && (
            <div className=" flex w-full justify-evenly items-center">
              {contact?.whatsapp && (
                <Link
                  href={`https://wa.me/${contact?.whatsapp}`}
                  className="btn btn-circle btn-sm"
                >
                  <Icon name="whatsapp" />
                </Link>
              )}
              {email && (
                <Link
                  href={`mailto:${email}?${
                    emailCC ? `cc=${emailCC}&` : ''
                  }subject=${subject}`}
                  className="btn btn-circle btn-sm"
                >
                  <Icon name="email" />
                </Link>
              )}
              {emergencyContact?.phone && (
                <EmergencyCall contact={emergencyContact} />
              )}
            </div>
          )}
          {/* <p className="whitespace-nowrap">
        Activo desde {dateDistance(joinedAt, new Date(), { addSuffix9: true })}
      </p> */}
          {isRequestRow && isOwner && (
            <div className="flex items-center ml-2">
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleAcceptRequest()
                }}
                variant="outline"
              >
                Acceptar
              </Button>
            </div>
          )}
        </div>
        {/*  <div className="w-full">
          <Section title={ 'Detalles' }>
            
          </Section>
        </div> */}
      </div>
      <Modal
        open={openmemberModal}
        handleOpen={handleOpenmemberModal}
        title="Detalles del integrante"
      >
        <div className="text-center">
          <p>{name}</p>
          <p>{email}</p>
          {alias && <p>{alias}</p>}
          {birth && <p>{dateFormat(birth, 'dd MMM yy')}</p>}
          <div className=" flex w-full justify-evenly items-center">
            {contact?.whatsapp && (
              <Link
                href={`https://wa.me/${contact?.whatsapp}`}
                className="btn btn-circle btn-sm"
              >
                <Icon name="whatsapp" />
              </Link>
            )}
            {email && (
              <Link
                href={`mailto:${email}?${
                  emailCC ? `cc=${emailCC}&` : ''
                }subject=${subject}`}
                className="btn btn-circle btn-sm"
              >
                <Icon name="email" />
              </Link>
            )}
            {emergencyContact?.phone && (
              <EmergencyCall contact={emergencyContact} />
            )}
          </div>

          <div>
            <h4>Información médica</h4>
            {medicInformation.blodType && (
              <p>Tipo de sangre: {medicInformation.blodType}</p>
            )}
            {medicInformation.considerations && (
              <p>Alergias: {medicInformation.considerations}</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}

const EmergencyCall = ({ contact }) => {
  const [open, setOpen] = useState()
  const handleOpen = () => {
    setOpen(!open)
  }
  return (
    <>
      <ButtonIcon
        iconName={'emergency'}
        className="btn-circle btn-sm text-error"
        onClick={handleOpen}
      />
      <Modal open={open} handleOpen={handleOpen} title="Llamada de emergencia">
        <div className="w-[90%] min-h-[10rem] flex justify-center items-center">
          <div>
            <p>
              Llamar a{' '}
              <span className="font-bold text-lg">{contact?.name}</span>
            </p>
            <div className="flex justify-center text-error">
              <Link
                href={`tel:${contact?.phone}`}
                className="btn btn-circle btn-warning"
              >
                <Icon name="phone" size="xl" />
              </Link>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
