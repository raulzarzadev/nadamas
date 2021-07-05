import { useEffect, useState } from 'react'
import s from './styles.module.css'

export default function PickerTime({
  name = 'picker-time',
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
      console.log('res', res)
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
      console.log('res', res)
      return res
    }
    setMinutes(MINUTES())
  }, [])

  const [time, setTime] = useState({ hours: '00', minutes: '00' })
  const handleChange = ({ target: { value, name } }) => {
    setTime({ ...time, [name]: value })
  }

  useEffect(() => {
    handleSetTime(`${time?.hours}:${time?.minutes}`)
  }, [time])

  const [hours, setHours] = useState([])
  const [minutes, setMinutes] = useState([])

  return (
    <div>
      <select defaultValue="00" onChange={handleChange} name="hours">
        <option value="00">00</option>
        {hours?.map((hour, i) => (
          <option value={hour} key={i}>
            {hour}
          </option>
        ))}
      </select>
      <select defaultValue="00" onChange={handleChange} name="minutes">
        <option value="00">00</option>
        {minutes?.map((hour, i) => (
          <option key={i} value={hour}>
            {hour}
          </option>
        ))}
      </select>
    </div>
  )
}
