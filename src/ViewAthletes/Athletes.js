import { useEffect, useState } from 'react'
import Button from '../Button'
import s from './styles.module.css'
import { getAthletes } from 'firebase/client'
import AthleteRow from '../AthleteRow'

export default function Athletes() {
  const [athletes, setAthletes] = useState([])

  useEffect(() => {
    getAthletes().then(setAthletes)
  }, [])

  athletes.sort((a, b) => {
    if (a.name > b.name) return 1
    if (a.name < b.name) return -1
    return 0
    console.log('a', a.name > b.name)
  })

  const [openEmergencyModal, setOpenEmergencyModal] = useState(false)

  return (
    <div className={s.athletes}>
      <h3>Todos los atletas</h3>
      {/* LISTA DE ATLETAS */}
      <Button nextLink href="/nuevo">
        Nuevo
      </Button>
      <div>
        {athletes?.map((athlete) => (
          <AthleteRow key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  )
}
