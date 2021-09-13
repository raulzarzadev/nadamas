import PickerRecord from '@comps/FormAthlete/Records/PickerRecord'
import PickerTime from '@comps/inputs/PickerTime'
import Autocomplete from '@comps/inputs/TextAutocomplete'
import { useEffect, useState } from 'react'

const swimmingStyles = [
  {
    label: 'C',
    id: 'crawl'
  },
  {
    label: 'D',
    id: 'back'
  },
  {
    label: 'P',
    id: 'breast'
  },
  {
    label: 'M',
    id: 'butterfly'
  },
  {
    label: 'CI',
    id: 'combi'
  }
]

const distances = [
  {
    label: '50',
    id: '50'
  },
  {
    label: '100',
    id: '100'
  },
  {
    label: '200',
    id: '200'
  },
  {
    label: '400',
    id: '400'
  },
  {
    label: '800',
    id: '400'
  }
]
export default function FormRecord() {
  const [athletes, setAthletes] = useState([])
  useEffect(() => {
    if (true) {
    }
  }, [])
  return (
    <div className="max-w-sm mx-auto pt-10">
      Estilo
      <div className="flex w-full justify-evenly py-2 px-1">
        {swimmingStyles.map((style) => (
          <label
            // key={i}
            className={` 
            group
            flex
            relative
            h-9
            w-9
            justify-center
            items-center
            m-2
            cursor-pointer
            shadow-lg 
            hover:shadow-sm
            ${false && `opacity-40 shadow-none cursor- cursor-not-allowed`}
            `}
          >
            <input
              // checked={form.includes(i)}
              //disabled={disabled}
              //onChange={handleChange}
              className="absolute opacity-0 h-0 w-0 "
              // className={`${s.check_input} ${disabled && style[disabled]}`}
              // name={i}
              type="checkbox"
            />
            <span className="text-2xl font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-green-400 w-full h">
              {style.label}
            </span>
          </label>
        ))}
      </div>
      Distacia
      <div className="flex w-full justify-evenly py-2 px-1">
        {distances.map((style) => (
          <label
            // key={i}
            className={` 
            group
            flex
            relative
            h-9
            w-9
            justify-center
            items-center
            m-2
            cursor-pointer
            shadow-lg 
            hover:shadow-sm
            ${false && `opacity-40 shadow-none cursor- cursor-not-allowed`}
            `}
          >
            <input
              // checked={form.includes(i)}
              //disabled={disabled}
              //onChange={handleChange}
              className="absolute opacity-0 h-0 w-0 "
              // className={`${s.check_input} ${disabled && style[disabled]}`}
              // name={i}
              type="checkbox"
            />
            <span className="text-2xl font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-green-400 w-full h">
              {style.label}
            </span>
          </label>
        ))}
      </div>
      Tiempo
      <PickerRecord />
      <div>
        <Autocomplete items={athletes} />
      </div>
    </div>
  )
}
