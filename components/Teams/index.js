import { getPublicTeams, listenPublicTeams } from '@/firebase/teams'
import Section from '@comps/Section'
import { useEffect, useState } from 'react'
import TeamCard from './TeamCard'

export default function Teams() {
  const [teams, setTeams] = useState([])
  useEffect(() => {
    listenPublicTeams(setTeams)
  }, [])
  return (
    <div className="">
      <Section title={'Mi equipo'} open indent={false}>
        Aun no estas inscrito a un equipo
      </Section>
      <Section title={'Buscar equipos'} indent={false}>
        Busca equipos y unete
        <h4 className="text-center">Equipo publicos</h4>
        {teams?.map((team) => (
          <TeamCard team={team} />
        ))}
      </Section>
      {/*   <Section title={'Estadisiticas  '} indent={false}>
        Estadisticas de los equipos publicos
      </Section> */}
    </div>
  )
}
