import { useUser } from '@/context/UserContext'
import { deleteTeam, listenTeam } from '@/firebase/teams'
import Button from '@comps/Inputs/Button'
import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import ButtonJoinTeam from '@comps/Inputs/ButtonJoinTeam'
import Loading from '@comps/Loading'
import Modal from '@comps/Modal'
import ModalDelete from '@comps/Modal/ModalDelete'
import Section from '@comps/Section'
import TeamMember from '@comps/TeamMember'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import TeamForm from '../TeamForm'
export default function TeamDetails({ teamId }) {
  const [team, setTeam] = useState(undefined)
  const router = useRouter()
  const { user } = useUser()
  useEffect(() => {
    listenTeam(teamId, setTeam)
  }, [])

  const isOwner = user?.id === team?.coach?.id || user.id === team?.userId

  console.log('team', team)

  const [openTeamForm, setOpenTeamForm] = useState()
  const handleOpenTeamForm = () => {
    setOpenTeamForm(!openTeamForm)
  }
  if (team === undefined) return <Loading />
  if (team === null)
    return (
      <div className="text-center my-10">
        <p className="p-4">Este equipo ya no existe.</p>
        <Button onClick={() => router.back()} variant="info">
          Regresar
        </Button>
      </div>
    )
  const {
    name = '',
    title,
    description,
    image,
    members = [],
    joinRequests = [],
    isPublic,
    userId,
    coachId,
    createdAt
  } = team

  const userIsMember = members?.includes(userId)
  console.log(userIsMember)

  return (
    <div className="">
      <div
        style={{ backgroundImage: image }}
        className="bg-green-50 h-10"
      ></div>
      <div className="text-center">
        <h1 className="text-xl ">{name || title}</h1>
        <p className="">
          Equipo <span>{isPublic ? 'publico' : 'privado'}</span>
        </p>
        {isOwner && <p className="font-thin italic">Eres dueño</p>}
        <p>{description}</p>
      </div>

      {isOwner && (
        <div className="flex justify-center my-2">
          <ButtonIcon
            label="Editar"
            iconName="edit"
            onClick={handleOpenTeamForm}
          />
          <Modal open={openTeamForm} handleOpen={handleOpenTeamForm}>
            <TeamForm team={team} />
          </Modal>
        </div>
      )}

      <div>
        <ButtonJoinTeam
          disabled={isOwner}
          teamId={teamId}
          membersList={team?.members || []}
          requestList={team?.joinRequests || []}
        />
      </div>

      {!userIsMember && (
        <>
          <div className="text-center my-2 ">
            <p>No eres miembro.</p>
            <p> Únete a este equipo para ver mas detalles</p>
          </div>
        </>
      )}

      {(userIsMember || isOwner) && (
        <>
          <Section
            open
            title={'Integrantes'}
            subtitle={`(${members?.length || 0})`}
          >
            {members?.map((memberId) => (
              <div key={memberId}>
                <TeamMember isTeamRow memberId={memberId} team={team} />
              </div>
            ))}
          </Section>
        </>
      )}
      {isOwner && (
        <>
          <Section
            title={`Solicitudes `}
            subtitle={`(${joinRequests?.length || 0})`}
          >
            {joinRequests?.map((memberId) => (
              <div key={memberId}>
                <TeamMember memberId={memberId} isRequestRow team={team} />
              </div>
            ))}
          </Section>
          <Section title={`Opciones `}>
            <div className="flex justify-center">
              <ModalDelete
                buttonLabel={'Borrar equipo'}
                labelDelete="equipo"
                buttonSize="sm"
                buttonVariant="error"
                handleDelete={() => {
                  deleteTeam(teamId)
                }}
              />
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
