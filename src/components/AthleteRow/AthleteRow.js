import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import EmergencyCallModal from '../Modals/EmergencyCallModal'
import { ContactIcon, EditIcon, EmergencyIcon } from '../../utils/Icons'
import s from './styles.module.css'
import Button from '@comps/inputs/Button'
import {  updateAttendanceList } from '@/firebase/attendance'

export default function AthleteRow({
  athlete,
  displaySetAttendance = false,
  date,
  assist=false,
}) {
  const { user } = useAuth()
  const { emerTitle, emerName, emerMobile, name, lastName, id, mobile, birth } =
    athlete
  const wstext = `Hola ${name}. Soy ${user.name} `

  const [openEmergencyModal, setOpenEmergencyModal] = useState(false)
  const handleOpenEmergencyCall = () => {
    setOpenEmergencyModal(!openEmergencyModal)
  }

  const handleSetAttendance = (id) => {
    updateAttendanceList({ date, athleteId: id })
      .then((res) => console.log(res))
      .catch((err) => console.log('err', err))
  }

  


  /*
  {
    id:athleteId,
    attendance:[
      'date()',
      'date2(),
    ]
  } 
  */

  return (
    <div className={s.athlete_row}>
      <div className={s.athlete} key={id}>
        <span className="text-sm sm:flex items-center hidden ">
          {formatDistanceToNowStrict(birth, {
            unit: 'year',
            addSuffix: false,
            locale: es
          }).replace(/años/, '')}
        </span>
        {`${name} ${lastName || ''} `}
      </div>
      <div className={s.athlete_actions}>
        {!!displaySetAttendance && (
          <div /* className={s.athlete_action} */>
            <input
              name="attendance"
              type="checkbox"
              defaultChecked={assist}
              onClick={(e) => handleSetAttendance(id, e)}
            ></input>
          </div>
        )}
        <div className="m-1" /* className={s.athlete_action} */>
          <Button disabled={!emerMobile} icon onClick={handleOpenEmergencyCall}>
            <EmergencyIcon className="text-red-500" />
          </Button>
        </div>
        <div className="m-1" /* className={s.athlete_action} */>
          <Button
            disabled={!mobile}
            icon
            href={`https://wa.me/521${mobile}?text=${wstext}`}
          >
            <ContactIcon />
          </Button>
        </div>
        <div className="m-1" /* className={s.athlete_action} */>
          <Button icon href={`/athletes/${id}`}>
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
