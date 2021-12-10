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
      {!athletesIds.length && 'No hay solicitudes'}
      {athletesIds?.map((athlete) => (
        <RequestAthleteRow
          key={athlete}
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
    <div key={athlete?.id} className="flex my-2 p-1">
      <div className='truncate w-1/2 text-left'>{athlete?.name || ''}</div>
      <div className=" flex justify-evenly w-1/2">
       <Button
          size="xs"
          variant=''
          onClick={() => onRejectRequest(athlete.id)}
        >
          Declinar
        </Button>
        <Button variant='success' size="xs" onClick={() => onAcceptRequest(athlete.id)}>
          Aceptar
        </Button> 
      </div>
    </div>
  )
}
