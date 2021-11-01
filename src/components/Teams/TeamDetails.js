import { getAthlete } from '@/firebase/athletes'
import {
  acceptTeamRequest,
  getTeam,
  rejectTeamRequest,
  removeTeam
} from '@/firebase/teams'
import { ROUTES } from '@/pages/ROUTES'
import { useAuth } from '@/src/context/AuthContext'
import { TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
import DeleteModal from '@comps/Modals/DeleteModal'
import Section from '@comps/Section'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import FormTeam from './FormTeam'
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
      /* .then((res) => {
          if (res === null) replace(ROUTES.teams.index)
          setTeam(res)
        })
        .catch((err) => console.log('err', err)) */
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
        replace('/teams')
      })
      .catch((err) => console.log(`err`, err))
  }

  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }

  if (team === undefined) return <Loading />
  return (
    <div className="max-w-md mx-auto">
      <FormTeam team={team} />
      <Section title={`Miembros (${team?.athletes?.length || 0})`}>
        <TeamMembers teamId={team?.id} members={team?.athletes} />
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
    </div>
  )
}

function JoinRequests({ teamId, requests = [] }) {
  const [athletes, setAthletes] = useState([])

  useEffect(() => {
    const athletes = requests.map(async (req) => await getAthlete(req))
    Promise.all(athletes).then(setAthletes)
    return () => {
      setAthletes([])
    }
  }, [requests])
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
      {!athletes.length && 'No hay solicitudes'}
      {athletes?.map((athlete) => (
        <div key={athlete?.id} className="flex justify-evenly">
          <div>{athlete?.name}</div>
          <div className="flex">
            <Button
              size="xs"
              variant=""
              onClick={() => handleRejectRequest(athlete.id)}
            >
              Declinar
            </Button>
            <Button size="xs" onClick={() => handleAcceptRequest(athlete.id)}>
              Aceptar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
