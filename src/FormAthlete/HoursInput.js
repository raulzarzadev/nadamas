import Button from '../Button'
import { dayLabels } from '../utils/Dates'
import { TrashBinIcon } from '../utils/Icons'
import s from './styles.module.css'

export const HoursInput = ({ name, value, onChange }) => {
  const availableHours = []
  for (let i = 17; i < 20; i++) {
    availableHours.push({
      value: i,
      label: `${i <= 9 ? `0${i}:00` : `${i}:00`}`
    })
  }
  return (
    <>
      <div className={s.day_title}>
        <div>{dayLabels[name]}</div>
        <div>
          <Button danger icon onClick={() => setTimeToNull(day)}>
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
          {availableHours.map((hour, i) => (
            <option key={i} value={hour.value}>
              {hour.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
