import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Button from '@comps/inputs/Button'
import { dayLabels } from '../../utils/Dates'
import { TrashBinIcon } from '../../utils/Icons'
import s from './styles.module.css'

export const HoursInput = ({
  name,
  userSchedule,
  value = undefined,
  onChange
}) => {
  useEffect(() => {
    setSchedule(userSchedule)
  }, [])

  const [schedule, setSchedule] = useState([])

  console.log(userSchedule)
  return (
    <>
      <div className={s.day_title}>
        <div>{dayLabels[name]}</div>
        <div>
          <Button icon onClick={() => setTimeToNull(day)}>
            <TrashBinIcon size="1rem" />
          </Button>
        </div>
      </div>
      <div className={s.select}>
        <select
          className={s.select_schedule}
          name={name}
          value={value || null}
          onChange={onChange}
        >
          <option value={null}>--:--</option>
          {schedule?.map((hour, i) => (
            <option key={i} value={hour.value}>
              {hour.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
