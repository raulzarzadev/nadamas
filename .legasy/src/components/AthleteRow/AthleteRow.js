import { getDate, getMonth, getWeek, getYear } from 'date-fns'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import EmergencyCallModal from '../Modals/EmergencyCallModal'
import {
  BirthCakeIcon,
  ContactIcon,
  EditIcon,
  EmergencyIcon,
  InfoIcon
} from '../../utils/Icons'
import Button from '@/legasy/src/components/inputs/Button'
import { updateAttendanceList } from '@/legasy/firebase/attendance'
import { useRouter } from 'next/router'
import useEditable from '@/legasy/src/hooks/useEditable'
import AthleteInformationModal from './AthleteInformationModal'

export default function AthleteRow({
  athlete = {},
  displaySetAttendance = false,
  date,
  assist = false,
  schedule,
  showLastPay,
  coachView = false,
  groupView = false
}) {
  const router = useRouter()
  const { user } = useAuth()
  const {
    emerTitle,
    emerName,
    emerMobile,
    name,
    lastName,
    id,
    mobile,
    birth,
    active
  } = athlete

  const wstext = `Hola ${name}. Soy ${user.name} `

  const [openEmergencyModal, setOpenEmergencyModal] = useState(false)
  const handleOpenEmergencyCall = () => {
    setOpenEmergencyModal(!openEmergencyModal)
  }

  const handleSetAttendance = (id) => {
    updateAttendanceList({ date, schedule, athleteId: id })
      .then((res) => console.log('res', res))
      .catch((err) => console.log('err', err))
  }

  const [weekBirthday, setWeekBirthday] = useState(false)

  useEffect(() => {
    setWeekBirthday(getWeek(date) === getWeek(birth))
  }, [date])

  const [lastPay, setLastPay] = useState(null)
  const { isOwner } = useEditable({ userId: athlete?.userId })
  const [openAthleteInfo, setOpenAthleteInfo] = useState(false)
  const handleOpenAthleteInfo = () => {
    setOpenAthleteInfo(!openAthleteInfo)
  }
  return (
    <div className="bg-primary-light dark:bg-secondary-dark flex w-full justify-between relative rounded-md my-1 pl-4 items-center ">
      <div className="" key={id}>
        {isOwner && (
          <span className="absolute left-0 top-0 bottom-0 w-3  bg-warning rounded-md rounded-r-none transform "></span>
        )}

        {weekBirthday && (
          <span className="relative group flex items-center">
            <BirthCakeIcon />
            <span className="text-xs absolute w-20 hidden group-hover:block bg-gray-400 -top-3 rounded-md text-center pt-0.5">
              {`${getDate(birth)}-${getMonth(birth)}-${getYear(birth)}`}
            </span>
          </span>
        )}
        <span>{`${name?.split(' ')[0]} ${
          lastName?.split(' ')[0] || ''
        } `}</span>
        {showLastPay && <span className="text-xs">last pay {lastPay}</span>}
      </div>
      <div className="flex justify-evenly items-center">
        {!!displaySetAttendance && (
          <div className="m-1">
            <label
              className={` group flex relative w-4 justify-center items-center m-2 cursor-pointer shadow-lg hover:shadow-sm `}
            >
              <input
                checked={assist}
                value={assist}
                onChange={(e) => handleSetAttendance(id)}
                // onClick={(e) => handleSetAttendance(id, e)}
                className="absolute opacity-0 h-0 w-0 "
                name="attendance"
                type="checkbox"
              />
              <span className="text-sm h-8 font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-success w-full ">
                A
              </span>
            </label>
          </div>
        )}
        <div className="m-1">
          <Button
            size="sm"
            disabled={!emerMobile}
            onClick={handleOpenEmergencyCall}
            iconOnly
          >
            <EmergencyIcon size="1rem" className="text-danger" />
          </Button>
        </div>
        <div className="m-1">
          <Button
            size="sm"
            disabled={!mobile}
            href={`https://wa.me/521${mobile}?text=${wstext}`}
            iconOnly
          >
            <ContactIcon size="1rem" className="" />
          </Button>
        </div>{' '}
        {coachView && (
          <div className="m-1">
            <Button
              size="sm"
              iconOnly
              onClick={() => router.push(`/athletes/${id}`)}
            >
              <EditIcon size="1rem" />
            </Button>
          </div>
        )}
        {groupView && (
          <div className="m-1">
            <Button size="sm" iconOnly onClick={handleOpenAthleteInfo}>
              <InfoIcon size="1rem" />
            </Button>
          </div>
        )}
      </div>
      <AthleteInformationModal open={openAthleteInfo} handleOpen={handleOpenAthleteInfo} athlete={athlete} />
      <EmergencyCallModal
        handleOpen={handleOpenEmergencyCall}
        open={openEmergencyModal}
        contact={{ emerTitle, emerName, emerMobile, name }}
      />
    </div>
  )
}
