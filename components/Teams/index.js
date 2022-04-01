import { useUser } from '@/context/UserContext'
import { getPublicTeams, listenPublicTeams } from '@/firebase/teams'
import Section from '@comps/Section'
import { useEffect, useState } from 'react'
import AthleteTeamsSection from './AthleteTeamsSecttion'
import TeamCard from './TeamCard'

export default function Teams() {
  const { user } = useUser()
  const [teams, setTeams] = useState([])
  useEffect(() => {
    listenPublicTeams(setTeams)
  }, [])
  return (
    <div className="">
      <AthleteTeamsSection userId={user.id} openSection={true} />
      <Section title={'Buscar equipos'} indent={false}>
        <p className="text-center my-3">Busca equipos  y unete</p>
        {/* <h4 className="text-center">Equipo publicos</h4> */}
        <div className="grid gap-2">
          {teams?.map((team) => (
            <TeamCard key={team.id} team={team} redirectTeam />
          ))}
        </div>
      </Section>
      {/*   <Section title={'Estadisiticas  '} indent={false}>
        Estadisticas de los equipos publicos
      </Section> */}
    </div>
  )
}
