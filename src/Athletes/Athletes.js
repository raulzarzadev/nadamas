import { useEffect, useState } from 'react'
import Button from '../Button'
import s from './styles.module.css'
import { getAthletes } from 'firebase/client'
import { useRouter } from 'next/router'
import { ContactIcon, EditIcon, EmergencyIcon } from '../utils/Icons'

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
  const handleOpenEmergencyCall = (contact) => {
    console.log('open emergency call', contact)
  }
  return (
    <div className={s.athletes}>
      <h3>Todos los atletas</h3>
      {/* LISTA DE ATLETAS */}
      <Button nextLink href="/nuevo">
        Nuevo
      </Button>
      <div>
        {athletes.map(
          ({ id, name, mobile, emerTitle, emerName, emerMobile }) => (
            <div className={s.athlete_row}>
              <div className={s.athlete} key={id}>
                {name}
              </div>
              <div className={s.athlete_action}>
                <Button icon nextLink href={`/atletas/${id}`}>
                  <EditIcon />
                </Button>
              </div>
              <div className={s.athlete_action}>
                <Button
                  icon
                  onClick={() =>
                    handleOpenEmergencyCall({ emerTitle, emerName, emerMobile })
                  }
                >
                  <EmergencyIcon />
                </Button>
              </div>
              <div className={s.athlete_action}>
                <Button icon nextLink href={`https://wa.me/521${mobile}`}>
                  <ContactIcon />
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
