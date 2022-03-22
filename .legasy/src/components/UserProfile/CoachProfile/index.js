import CoachEvents from "@/legasy/src/components/Events/CoachEvents"
import ButtonNewTeam from "@/legasy/src/components/inputs/ButtonNewTeam"
import CoachSchedule from "@/legasy/src/components/Schedules/CoachSchedule"
import Section from "@/legasy/src/components/Section"
import TeamsList from "@/legasy/src/components/Teams/TeamsList"

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
