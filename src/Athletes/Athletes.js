import { useEffect, useState } from 'react'
import Button from '../Button'
import s from './styles.module.css'
import { getAthletes } from 'firebase/client'
import { useRouter } from 'next/router'
export default function Athletes() {
  const router = useRouter()
  const [athletes, setAthletes] = useState([])

  useEffect(() => {
    getAthletes().then(setAthletes)
  }, [])

  console.log('athletes', athletes)
  const handleClickAthlete = (id) => {
    router.push(`/atletas/${id}`)
  }
  return (
    <div className={s.athletes}>
      <h3>Todos los atletas</h3>
      {/* LISTA DE ATLETAS */}
      <Button nextLink href="/nuevo">
        Nuevo
      </Button>
      <div>
        {athletes.map(({ id, name }) => (
          <div key={id} onClick={() => handleClickAthlete(id)}>
            {name}
          </div>
        ))}
      </div>
    </div>
  )
}
