import { DISTANCES, STYLES } from '@/src/CONSTANTS/SWIMMING_TESTS'
import { useEffect, useState } from 'react'

export default function PickerTest({
  test = undefined,
  setTest = (test) => console.log(`test`, test)
}) {
  useEffect(() => {
    if (test) {
      setForm(test)
    }
  }, [test])
  const [form, setForm] = useState({})

  const handleChangeDistance = ({ target }) => {
    const newValue = { ...form, distance: target.name }
    setForm(newValue)
    setTest(newValue)
  }
  const handleChangeStyle = ({ target }) => {
    const newValue = { ...form, style: target.name }
    setForm(newValue)
    setTest(newValue)
  }
  return (
    <div className="">
      <div>
        <h5 className="font-bold">Estilo</h5>
        <div className="flex w-full justify-evenly flex-wrap">
          {STYLES.map(({ label, id }) => (
            <div className="w-1/5 p-2" key={id}>
              <SelectBox
                label={label}
                name={id}
                onChange={handleChangeStyle}
                checked={form?.style === id}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <h5 className="font-bold">Distancia</h5>
        <div className="flex w-full flex-wrap ">
          {DISTANCES.map(({ label, id }) => (
            <div className="w-1/5 p-2 " key={id}>
              <SelectBox
                label={label}
                name={id}
                onChange={handleChangeDistance}
                checked={form?.distance === id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SelectBox = ({ label, name, onChange, checked }) => (
  <label
    key={name}
    className={` 
            group
            flex
            relative
            h-full
            w-full
            justify-center
            items-center
            cursor-pointer
            shadow-lg 
            hover:shadow-sm
            rounded-lg
            ${false && `opacity-40 shadow-none cursor- cursor-not-allowed`}
            `}
  >
    <input
      checked={checked}
      //disabled={disabled}
      onChange={onChange}
      className="absolute opacity-0 h-0 w-0 "
      // className={`${s.check_input} ${disabled && style[disabled]}`}
      name={name}
      type="checkbox"
    />
    <div className=" font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-secondary checked-sibiling:dark:bg-primary w-full ">
      {label}
    </div>
  </label>
)
