import { useEffect, useState } from 'react'
import Button from '../Button'
import s from './styles.module.css'
import { getAthletes } from 'firebase/client'
import { ContactIcon, EditIcon, EmergencyIcon } from '../utils/Icons'
import EmergencyCallModal from '../Modals/EmergencyCallModal'

export default function Athletes() {
  const [athletes, setAthletes] = useState([])

  useEffect(() => {
    getAthletes().then(setAthletes)
  }, [])

  const [openEmergencyModal, setOpenEmergencyModal] = useState(false)
  const handleOpenEmergencyCall = () => {
    setOpenEmergencyModal(!openEmergencyModal)
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
          ({ id, name, lastName, mobile, emerTitle, emerName, emerMobile }) => (
            <div className={s.athlete_row}>
              <div className={s.athlete} key={id}>
                {`${name} ${lastName ? `${lastName[0]}.` : ''}`}
              </div>
              <div className={s.athlete_action}>
                <Button icon onClick={handleOpenEmergencyCall}>
                  <EmergencyIcon style={{ color: 'red' }} />
                </Button>
              </div>
              <div className={s.athlete_action}>
                <Button icon nextLink href={`https://wa.me/521${mobile}`}>
                  <ContactIcon />
                </Button>
              </div>
              <div className={s.athlete_action}>
                <Button icon nextLink href={`/atletas/${id}`}>
                  <EditIcon />
                </Button>
              </div>
              <EmergencyCallModal
                handleOpen={handleOpenEmergencyCall}
                open={openEmergencyModal}
                contact={{ emerTitle, emerName, emerMobile, name }}
              />
            </div>
          )
        )}
      </div>
    </div>
  )
}
