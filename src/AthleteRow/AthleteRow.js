import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import Button from '../Button'
import EmergencyCallModal from '../Modals/EmergencyCallModal'
import { ContactIcon, EditIcon, EmergencyIcon } from '../utils/Icons'
import s from './styles.module.css'

export default function AthleteRow({
  assist,
  athlete,
  handleSetAttendance = false
}) {
  const { emerTitle, emerName, emerMobile, name, lastName, id, mobile, birth } =
    athlete
  const [openEmergencyModal, setOpenEmergencyModal] = useState(false)
  const handleOpenEmergencyCall = () => {
    setOpenEmergencyModal(!openEmergencyModal)
  }
  return (
    <div className={s.athlete_row}>
      <div className={s.athlete} key={id}>
        <span>
          {formatDistanceToNowStrict(birth, {
            unit: 'year',
            addSuffix: false,
            locale: es
          }).replace(/años/, '')}
        </span>
        {`${name} ${lastName || ''} `}
      </div>
      <div className={s.athlete_actions}>
        {!!handleSetAttendance && (
          <div className={s.athlete_action}>
            <input
              name="attendance"
              type="checkbox"
              defaultChecked={assist}
              onClick={(e) => handleSetAttendance(id, e)}
            ></input>
          </div>
        )}
        <div className={s.athlete_action}>
          <Button icon onClick={handleOpenEmergencyCall}>
            <EmergencyIcon style={{ color: 'red' }} />
          </Button>
        </div>
        <div className={s.athlete_action}>
          <Button
            disabled={!mobile}
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
