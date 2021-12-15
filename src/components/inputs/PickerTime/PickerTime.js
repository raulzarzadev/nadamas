import { useEffect, useState } from 'react'
import { RiZzzFill } from 'react-icons/ri'
import s from './styles.module.css'

export default function PickerTime({
  startsAt = 6,
  endsAt = 22,
  minutesStep = 15,
  time = {},
  defaultTime = {  },
  handleSetTime = () => {}
}) {

  useEffect(() => {
    const HOURS = () => {
      let res = []
      for (let i = startsAt; i < endsAt; i++) {
        let label = `${i}`
        if (i < 10) label = `0${i}`

        res.push(label)
      }
      return res
    }
    setHoursOptions(HOURS())
  }, [])

  useEffect(() => {
    const MINUTES = () => {
      let res = []
      for (let i = 0; i < 60; i = i + parseInt(minutesStep)) {
        let label = `${i}`
        if (i < 10) label = `0${i}`
        res.push(label)
      }
      return res
    }
    setMinutesOptions(MINUTES())
  }, [])

  const [_time, _setTime] = useState(defaultTime)
  const handleChange = ({ target: { value, name } }) => {
    _setTime({ ..._time, [name]: parseInt(value) })
    handleSetTime({ ..._time, [name]: parseInt(value) })
  }

  
  
  const [hoursOptions, setHoursOptions] = useState([])
  const [minutesOptions, setMinutesOptions] = useState([])

  return (
    <div className={s.time}>
      <label>
        Hrs
        <select
          className={s.select}
          value={_time?.hours}
          onChange={handleChange}
          name="hours"
        >
          {hoursOptions?.map((hour, i) => (
            <option value={hour} key={i}>
              {hour}
            </option>
          ))}
        </select>
      </label>
      <span className={s.separator}>:</span>
      <label>
        Min
        <select
          className={s.select}
          value={_time?.minutes}
          onChange={handleChange}
          name="minutes"
        >
          {minutesOptions?.map((hour, i) => (
            <option key={i} value={hour}>
              {hour}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
