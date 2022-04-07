import { DISTANCES, STYLES } from '@/CONSTANTS/SWIMMING_TESTS'
import { useEffect, useState } from 'react'

export default function PickerTest({
  test = undefined,
  setTest = (fieldName, fieldValue) => console.log(`test`, test)
}) {
 

  const handleChangeDistance = ({ target }) => {
    const newValue = { ...test, distance: target.name }
    setTest('test', newValue)
  }
  const handleChangeStyle = ({ target }) => {
    const newValue = { ...test, style: target.name }
    setTest('test', newValue)
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
                checked={test?.style === id}
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
                checked={test?.distance === id}
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
    <div className="text-sm p-0.5  checked-sibiling:text-info-content font-bold flex justify-center items-center rounded-lg checked-sibiling:bg-info checked-sibiling:dark:bg-info w-full ">
      {label}
    </div>
  </label>
)
