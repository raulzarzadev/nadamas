import Section from '@/legasy/src/components/Section'
import JoinTeamRequests from './JoinTeamReaquests'

export default function RequestsSection({ team }) {
  return (
    <Section
      title={`Solicitudes `}
      subtitle={`(${team?.joinRequests?.length || 0})`}
    >
      <JoinTeamRequests
        teamId={team?.id}
        requests={team?.joinRequests}
        setRequests={(props) => console.log(`props`, props)}
      />
    </Section>
  )
}
