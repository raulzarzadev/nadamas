import { useState } from 'react'
import Button from '../Button'
import EmergencyCallModal from '../Modals/EmergencyCallModal'
import { ContactIcon, EditIcon, EmergencyIcon } from '../utils/Icons'
import s from './styles.module.css'

export default function AthleteRow({ athlete }) {
  const { emerTitle, emerName, emerMobile, name, lastName, id, mobile } =
    athlete
  const [openEmergencyModal, setOpenEmergencyModal] = useState(false)
  const handleOpenEmergencyCall = () => {
    setOpenEmergencyModal(!openEmergencyModal)
  }
  return (
    <div className={s.athlete_row}>
      <div className={s.athlete} key={id}>
        {`${name} ${lastName || ''}`}
      </div>
      <div className={s.athlete_actions}>
        <div className={s.athlete_action}>
          <Button icon onClick={handleOpenEmergencyCall}>
            <EmergencyIcon style={{ color: 'red' }} />
          </Button>
        </div>
        <div className={s.athlete_action}>
          <Button
            disabled={!!mobile}
            icon
            nextLink
            href={`https://wa.me/521${mobile}`}
          >
            <ContactIcon />
          </Button>
        </div>
        <div className={s.athlete_action}>
          <Button icon nextLink href={`/atletas/${id}`}>
            <EditIcon />
          </Button>
        </div>
      </div>
      <EmergencyCallModal
        handleOpen={handleOpenEmergencyCall}
        open={openEmergencyModal}
        contact={{ emerTitle, emerName, emerMobile, name }}
      />
    </div>
  )
}
