import Button from '@comps/inputs/Button'

export default function ButtonJoinEvent({ eventId, athleteId }) {
  const handleClick = (e) => {
    console.log(`eventId, athleteId`, eventId, athleteId)
    if (!athleteId) {
      console.log(`debes tener un athleta primero`)
    } else {
      console.log('unirse al evento con el id athlete')
    }
  }

  return <Button onClick={handleClick} label="Participar" />
}
