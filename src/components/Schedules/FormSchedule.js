import { dayLabels } from '@/src/utils/Dates'
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

export default function FormSchedule({ schedule, setSchedule }) {
  const [form, setForm] = useState({})

  useEffect(() => {
    if (schedule) {
      setForm(schedule)
    }
  }, [schedule])

  const handleChange = ({ target: { value, name } }) => {
    setForm({ ...form, [name]: [value] })
    setSchedule({ ...form, [name]: [value] })
  }
  return (
    <>
      <div className="">
        <div className="flex flex-col">
          <div className="flex flex-wrap justify-center">
            {Object?.keys(SCHEDULE_BASE)?.map((day, i) => (
              <label
                key={day}
                className="w-1/2 flex flex-col items-center sm:w-1/4 p-1"
              >
                {dayLabels[day]}
                <div className="flex justify-center">
                  <select
                    className=" bg-gray-500 p-1 m-2 text-lg w-full rounded"
                    name={day}
                    value={form[day] || null}
                    onChange={handleChange}
                  >
                    <option value="">--:--</option>
                    {SCHEDULE_BASE[day]?.map((hour, i) => (
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
