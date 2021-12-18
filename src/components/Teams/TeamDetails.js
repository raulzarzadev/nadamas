import {
  acceptTeamRequest,
  getTeam,
  rejectTeamRequest,
  removeTeam
} from '@/firebase/teams'

import { useAuth } from '@/src/context/AuthContext'
import { TrashBinIcon } from '@/src/utils/Icons'
import Info from '@comps/Alerts/Info'
import RequestRows from '@comps/AthleteRow/RequestRows'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import DeleteModal from '@comps/Modals/DeleteModal'
import Section from '@comps/Section'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ButtonJoinTeam from './ButtonJoinTeam'
import FormTeam from './FormTeam'
import MemberTeamView from './MemberTeamview'
import TeamMembers from './TeamMembers'

export default function TeamDetails() {
  const [team, setTeam] = useState(undefined)
  const {
    query: { id: teamId },
    replace
  } = useRouter()
  useEffect(() => {
    if (teamId) {
      getTeam(teamId, setTeam)
    }
  }, [teamId])

  const [isOwner, setIsOwner] = useState(false)
  const { user } = useAuth()
  useEffect(() => {
    setIsOwner(team?.userId === user?.id)
  }, [user, team])

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

  if (team === undefined) return <Loading />

  const teamCoach = user?.id === team?.coach?.id
  return (
    <div className="max-w-md mx-auto">
      {teamCoach ? (
        <>
          <FormTeam team={team} />
          <Section title={`Miembros (${team?.athletes?.length || 0})`}>
            <TeamMembers
              teamCoaches={team?.coaches}
              teamId={team?.id}
              members={team?.athletes}
              coaches={team?.coaches}
              coachView={teamCoach}
            />
          </Section>
          <Section title={`Solicitudes (${team?.joinRequests?.length || 0})`}>
            <JoinRequests
              teamId={teamId}
              requests={team?.joinRequests}
              setRequests={(props) => console.log(`props`, props)}
            />
          </Section>
          <Section title="Opciones">
            {isOwner && (
              <div className="w-32 flex">
                <Button
                  label="Eliminar"
                  variant="danger"
                  size="xs"
                  onClick={handleOpenDelete}
                >
                  Borrar equipo
                  <TrashBinIcon />
                </Button>
                <DeleteModal
                  open={openDelete}
                  text="Elimar este equipo de forma permanente"
                  handleDelete={handleDeleteTeam}
                  handleOpen={handleOpenDelete}
                ></DeleteModal>
              </div>
            )}
          </Section>
        </>
      ) : (
        <div>
          <TeamPublicDetails team={team} />
        </div>
      )}
    </div>
  )
}

const TeamPublicDetails = ({ team }) => {
  const [alreadyIn, setAlreadyIn] = useState(false)
  const {
    user: { athleteId, coach }
  } = useAuth()
  useEffect(() => {
    if (team.athletes.includes(athleteId)) {
      setAlreadyIn(true)
    } else {
      setAlreadyIn(false)
    }
  }, [team, athleteId])

  return (
    <div>
      <h3 className="text-3xl w-full text-center pt-8">{team?.title}</h3>
      {team?.publicTeam ? (
        <>
          <p className="font-thin text-center">
            Equipo público ({team?.athletes?.length || 0})
          </p>
          <p className="font-thin text-center">{team?.coach?.name}</p>
          {coach && (
            <Info text="No te puedes unir por que eres entrenador" fullWidth />
          )}
          {athleteId && !coach && (
            <div className="w-48 mx-auto">
              <ButtonJoinTeam
                teamId={team?.id}
                requestList={team?.joinRequests}
                participantsList={team?.athletes}
              />
            </div>
          )}
        </>
      ) : (
        <p className="font-thin text-center">Equipo cerrado</p>
      )}
      {alreadyIn && <MemberTeamView team={team} />}
    </div>
  )
}

function JoinRequests({ teamId, requests = [] }) {
  const handleAcceptRequest = (athleteId) => {
    acceptTeamRequest(teamId, athleteId)
      .then((res) => {
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }
  const handleRejectRequest = (athleteId) => {
    rejectTeamRequest(teamId, athleteId)
      .then((res) => {
        console.log(`res`, res)
      })
      .catch((err) => console.log(`err`, err))
  }

  return (
    <div>
      <RequestRows
        athletesIds={requests}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
      />
    </div>
  )
}
