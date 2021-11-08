import useAthlete from '@/src/hooks/useAthlete'
import Button from '@comps/inputs/Button'
import Loading from '@comps/Loading'

export default function RequestRows({
  athletesIds,
  onAcceptRequest = () => {},
  onRejectRequest = () => {}
}) {
  return (
    <div className="">
      {!athletes.length && 'No hay solicitudes'}
      {athletesIds?.map((athlete) => (
        <RequestAthleteRow
          athleteId={athlete}
          onAcceptRequest={onAcceptRequest}
          onRejectRequest={onRejectRequest}
        />
      ))}
    </div>
  )
}

const RequestAthleteRow = ({
  athleteId,
  onAcceptRequest = () => {},
  onRejectRequest = () => {}
}) => {
  const { athlete } = useAthlete(athleteId)
  if (athlete === undefined) return <Loading />
  return (
    <div key={athlete?.id} className="flex justify-evenly">
      <div>{athlete?.name}</div>
      {console.log(`athlete`, athlete)}
      <div className="flex">
        <Button
          size="xs"
          variant=""
          onClick={() => onRejectRequest(athlete.id)}
        >
          Declinar
        </Button>
        <Button size="xs" onClick={() => onAcceptRequest(athlete.id)}>
          Aceptar
        </Button>
      </div>
    </div>
  )
}
