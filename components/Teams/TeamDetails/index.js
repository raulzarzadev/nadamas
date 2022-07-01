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
import MainModal from '../../Modal/MainModal'
import FormPost from '../Posts/formPost'
import TeamForm from '../TeamForm'
import { listenTeamPosts } from '@/firebase/posts/main'
import PostSquare from '../Posts/postSquare'
import { SquareAdd } from '../../SquareAdd'
import PreviewImage from '../../PreviewImage'
import TeamPosts from './TeamPosts'
import QRCodes from './QRCodes'
import PROJECT_INFO from '../../../CONSTANTS/PROJECT_INFO'

export default function TeamDetails({ teamId }) {
  const router = useRouter()
  const { user } = useUser()
  const [team, setTeam] = useState(undefined)
  useEffect(() => {
    listenTeam(teamId, setTeam)
  }, [])

  const [teamPosts, setTeamPosts] = useState([])
  useEffect(() => {
    listenTeamPosts(teamId, (teams) => setTeamPosts(teams))
  }, [])


  const [openTeamForm, setOpenTeamForm] = useState()
  const handleOpenTeamForm = () => {
    setOpenTeamForm(!openTeamForm)
  }
  if (team === undefined) return <Loading />
  if (team === null)
    return (
      <div className="text-center my-10">
        <p className="p-4">Este equipo no existe.</p>
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
    // userId,
    coachId,
    createdAt
  } = team

  const teamOwner = team?.userId
  const teamCoach = {
    id: team?.coach?.id || null,
    name: team?.coach?.name || null
  }
  const userId = user?.id

  const isOwnerOrCoach = userId === teamCoach?.id || userId === teamOwner
  const isMember = members?.includes(user?.id)


  return (
    <div className="">
      <div className="grid mt-2 text-base-content">
        <div className='h-32'>

          {team?.image &&
            <PreviewImage image={team.image} previewSize='full-w' />
          }
        </div>

        <div className="flex justify-end text-sm font-thin ">
          {isOwnerOrCoach && <p className="mx-1">tuyo</p>}
          <p className="mx-1">{isPublic ? 'publico' : 'privado'}</p>
          <p className="mx-1">{members.length}</p>
          {isOwnerOrCoach && (
            <p className="mx-1">
              <span className="font-bold">{joinRequests.length}</span>
            </p>
          )}
        </div>
        <div className="text-center">
          <h1 className="text-4xl ">{name || title}</h1>
          <p>{description}</p>
        </div>
      </div>

      {team?.showQRs &&
        <QRCodes codes={[
          {
            label: 'Equipo en nadamas',
            value: `${PROJECT_INFO.url}${router.asPath}`
          },
          ...team?.QRCodes
        ]} />
      }



      {!isOwnerOrCoach &&
        <div>
          {!isMember && (
            <>
              <div className="text-center my-2 ">
                <p>No eres miembro.</p>
                <p> Únete a este equipo para ver mas detalles</p>
              </div>
            </>
          )}
          <ButtonJoinTeam
            disabled={isOwnerOrCoach}
            teamId={teamId}
            membersList={team?.members || []}
            requestList={team?.joinRequests || []}
          />
        </div>}


      <TeamPosts team={team} isOwnerOrCoach={isOwnerOrCoach} isMember={isMember} />

      {isMember && (
        <div>
          <h2 className='font-bold text-lg text-center'>
            Miembro
          </h2>
          <div className='grid grid-flow-col overflow-auto gap-4 p-2'>
            <TeamMember memberId={user.id} team={team} />
          </div>
        </div>)}

      {(isOwnerOrCoach) && (
        <>

          <Section
            open
            title={'Integrantes'}
            subtitle={`(${members?.length || 0})`}
          >
            <div className="grid gap-2">
              {members?.map((memberId) => (
                <div key={memberId}>
                  <TeamMember isTeamRow memberId={memberId} team={team} />
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
      {isOwnerOrCoach && (
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
            <div className="flex justify-evenly">
              <ButtonIcon
                id='open-modal-edit'
                label="Editar"
                iconName="edit"
                onClick={handleOpenTeamForm}
              />
              <Modal title='Editar' open={openTeamForm} handleOpen={handleOpenTeamForm}>
                <TeamForm team={team} />
              </Modal>
              <ModalDelete
                buttonLabel={'Borrar equipo'}
                labelDelete="equipo"
                buttonSize="sm"
                buttonVariant="error"
                deleteSuccessful={() => router.back()}
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

