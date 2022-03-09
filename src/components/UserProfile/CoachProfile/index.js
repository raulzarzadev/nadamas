import CoachEvents from "@comps/Events/CoachEvents"
import ButtonNewTeam from "@comps/inputs/ButtonNewTeam"
import CoachSchedule from "@comps/Schedules/CoachSchedule"
import Section from "@comps/Section"
import TeamsList from "@comps/Teams/TeamsList"

const CoachProfile = ({ isCoach = false, coachId }) => {
  if (!isCoach)
    return (
      <div className="text-center">
        No eres entrenador. ¿Quieres ser entrendor en nadamas?
      </div>
    )
  return (
    <div>
      <Section title="Eventos organizados" indent={false}>
        <CoachEvents coachId={coachId} />
      </Section>
      <Section title="Mis equipos" indent={false}>
        <ButtonNewTeam />
        <TeamsList coachId={coachId} />
      </Section>
      <Section title="Mi horario" indent={false}>
        <CoachSchedule coachId={coachId} />
      </Section>
    </div>
  )
}
export default CoachProfile
