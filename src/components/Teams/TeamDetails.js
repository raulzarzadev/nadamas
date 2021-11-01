import { getAthlete } from '@/firebase/athletes'
import {
  acceptTeamRequest,
  getTeam,
  rejectTeamRequest,
  updateTeam
} from '@/firebase/teams'
import { ROUTES } from '@/pages/ROUTES'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'
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

  if (team === undefined) return <Loading />

  return (
    <div className="">
      <FormTeam team={team} />
      <TeamMembers
        teamId={team?.id}
        members={team?.athletes}
        setMembers={(props) => console.log(`props`, props)}
      />
      {!!team?.joinRequests?.length && (
        <JoinRequests
          teamId={teamId}
          requests={team?.joinRequests}
          setRequests={(props) => console.log(`props`, props)}
        />
      )}
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
      <Section title={`Solicitudes (${athletes?.length})`}>
        {athletes?.map((athlete) => (
          <div key={athlete?.id} className="flex justify-evenly">
            {console.log(`athlete`, athlete)}
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
      </Section>
    </div>
  )
}
