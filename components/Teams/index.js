import { getPublicTeams, listenPublicTeams } from '@/firebase/teams'
import Section from '@comps/Section'
import { useEffect, useState } from 'react'

export default function Teams() {
  const [teams, setTeams] = useState([])
  useEffect(() => {
    listenPublicTeams(setTeams)
  }, [])
  console.log(teams)
  return (
    <div className="">
      <Section title={'Mi equipo'} open indent={false}>
        Aun no estas inscrito a un equipo
      </Section>
      <Section title={'Buscar equipos'} indent={false}>
        Busca equipos y unete
      </Section>
      {/*   <Section title={'Estadisiticas  '} indent={false}>
        Estadisticas de los equipos publicos
      </Section> */}
    </div>
  )
}
