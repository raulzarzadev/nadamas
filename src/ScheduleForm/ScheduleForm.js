import { useEffect, useState } from 'react'
import Button from '../Button'
import PickerDays from '../PickerDays'
import PickerTime from '../PickerTime'
import { dayLabels } from '../utils/Dates'
import { AddIcon, TrashBinIcon } from '../utils/Icons'
import s from './styles.module.css'

export default function ScheduleForm(
  {
    /*  schedule = [],
  setSchedule = () => {} */
  }
) {
  /*  useEffect(() => {
    setSchedule(_schedule)
  }, [_schedule])

  useEffect(() => {
    if (schedule.length) {
      _setSchedule(schedule)
    }
  }, [schedule]) */

  const [_schedule, _setSchedule] = useState([])
  console.log('_schedule', _schedule)

  const handleChangeSchedule = (schedule) => {
    _setSchedule(schedule)
  }
  const handleAddSchedule = (newSchedule) => {
    _setSchedule(newSchedule)
  }
  return (
    <div>
      <ScheduleDisplay
        schedule={_schedule}
        setSchedule={handleChangeSchedule}
      />
      <ScheduleSelect schedule={_schedule} setNewSchedule={handleAddSchedule} />
    </div>
  )
}

const ScheduleDisplay = ({ schedule = [], setSchedule = () => {} }) => {
  const handleDeleteHour = (hour) => {
    const deletedScheduleHour = (hourToRemove) => {
      const res = schedule.filter(({ hour }) => hourToRemove !== hour)
      return res
    }
    setSchedule(deletedScheduleHour(hour))
  }

  return (
    <div>
      {schedule.map(({ hour, days }, i) => (
        <div
          key={i}
          style={{ display: 'flex', width: '100%', alignItems: 'center' }}
        >
          <Button onClick={() => handleDeleteHour(hour)}>
            <TrashBinIcon size={'.7rem'} />
          </Button>
          {hour}
          <div style={{ display: 'flex', width: '80%' }}>
            {days.map((day, i) => (
              <div
                key={i}
                style={{ margin: 4, padding: 4 }}
              >{`${dayLabels[day][0]}${dayLabels[day][1]}`}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const ScheduleSelect = ({ schedule = [], setNewSchedule = () => {} }) => {
  const initalFormState = { hour: '00:00', days: [] }
  const [form, setForm] = useState(schedule || initalFormState)

  const handleSetTime = (time) => {
    setForm({ ...form, hour: time })
  }
  const handleSetDays = (days) => {
    setForm({ ...form, days })
  }
  const handleAddSchedule = () => {
    const removeRepitedHour = schedule.filter(({ hour }) => hour !== form.hour)
    console.log('removeRepitedHour', removeRepitedHour)

    setNewSchedule([...removeRepitedHour, form])
  }

  const [days, setDays] = useState([])

  useEffect(() => {
    setDays(schedule.find(({ hour }) => hour === form.hour)?.days)
  }, [form])

  return (
    <div className={s.schedule}>
      <PickerTime
        time={form?.hour}
        minutesStep="15"
        handleSetTime={handleSetTime}
      />
      <PickerDays days={days} handleSetDays={handleSetDays} />
      <Button onClick={handleAddSchedule}>
        <AddIcon />
      </Button>
    </div>
  )
}
