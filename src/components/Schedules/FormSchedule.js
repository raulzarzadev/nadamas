import { dayLabels } from '@/src/utils/Dates'
import Info from '@comps/Alerts/Info'
import { useEffect, useState } from 'react'

const SCHEDULE_BASE = {
  0: setDayScheduleBetween(),
  1: setDayScheduleBetween(),
  2: setDayScheduleBetween(),
  3: setDayScheduleBetween(),
  4: setDayScheduleBetween(),
  5: setDayScheduleBetween(),
  6: setDayScheduleBetween()
}

function setDayScheduleBetween(startAt = 6, endAt = 22) {
  let res = []
  for (let i = startAt; i < endAt; i++) {
    const aux = i > 9 ? `${i}:00` : `0${i}:00`
    res.push(aux)
  }
  return res
}

export default function FormSchedule({ schedule, setSchedule, coach, availableSchedule }) {
  const [form, setForm] = useState({})
  const [scheduleBase, setScheduleBase] = useState()
  useEffect(() => {
    if (coach) {
      setScheduleBase(availableSchedule)
    } else {
      setScheduleBase(SCHEDULE_BASE)
    }
  }, [coach, availableSchedule])

  useEffect(() => {
    if (schedule) {
      setForm(schedule)
    }
  }, [schedule])

  const handleChange = ({ target: { value, name } }) => {
    setForm({ ...form, [name]: [value] })
    setSchedule({ ...form, [name]: [value] })
  }
  if (!scheduleBase) return <Info text="Sin horarios disponibles" />
  return (
    <>
      <div className="">
        <div className="flex flex-col">
          <div className="flex flex-wrap justify-center">
            {Object?.keys(scheduleBase)?.map((day, i) => (
              <label
                key={day}
                className="w-1/2 flex flex-col items-center sm:w-1/4 p-1"
              >
                {dayLabels[day]}
                <div className="flex justify-center">
                  <select
                    className=" bg-secondary-dark p-1 m-2 text-lg w-full rounded"
                    name={day}
                    value={form[day]?.[0] || ''}
                    onChange={handleChange}
                  >
                    <option value="">--:--</option>
                    {scheduleBase[day]?.map((hour, i) => (
                      <option key={i} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
