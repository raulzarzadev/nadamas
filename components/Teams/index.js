import Section from '@comps/Section'

export default function Teams() {
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
