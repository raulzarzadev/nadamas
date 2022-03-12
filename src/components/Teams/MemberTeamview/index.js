import Section from '@comps/Section'
import TeamMembers from '../TeamMembers'
import TeamReleases from './TeamReleases'

export default function MemberTeamView({ team }) {
  return (
    <div className="">
      <Section title={'Comunicados'} indent={false} open>
        <TeamReleases team={team} />
      </Section>
      <Section title="Miembros" indent={false} open>
        <TeamMembers
          coachView={false}
          teamCoaches={team?.coaches}
          teamId={team.id}
          members={team?.athletes}
        />
      </Section>
      <Section title="Mis cuotoas">
        Esta información aun no esta disponible
      </Section>
    </div>
  )
}
