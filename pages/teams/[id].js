import TeamDetails from '@comps/Teams/TeamDetails'
import { useRouter } from 'next/router'
export default function team() {
  const {
    query: { id }
  } = useRouter()
  return (
    <div className="">
      <TeamDetails teamId={id} />
    </div>
  )
}
