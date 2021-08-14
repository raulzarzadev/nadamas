import { useEffect, useState } from 'react'
import s from './styles.module.css'

export default function PickerTime({
  time = '--:--',
  startsAt = 6,
  endsAt = 22,
  minutesStep = 15,
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
    setHours(HOURS())
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
    setMinutes(MINUTES())
  }, [])

  const [_time, _setTime] = useState({ hours: '00', minutes: '00' })
  const handleChange = ({ target: { value, name } }) => {
    _setTime({ ..._time, [name]: value })
  }

  useEffect(() => {
    handleSetTime(`${_time?.hours}:${_time?.minutes}`)
  }, [_time])

  useEffect(() => {
    if (time) {
      const formatValue = () => {
        const timeArray = time.split(':')
        _setTime({ hours: timeArray[0], minutes: timeArray[1] })
      }
      _setTime(formatValue)
    }
  }, [time])

  const [hours, setHours] = useState([])
  const [minutes, setMinutes] = useState([])

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
          <option value="--">--</option>
          {hours?.map((hour, i) => (
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
          <option value="--">--</option>
          {minutes?.map((hour, i) => (
            <option key={i} value={hour}>
              {hour}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
