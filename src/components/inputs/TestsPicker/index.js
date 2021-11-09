import { DISTANCES, STYLES } from '@/src/constants/SWIMMING_TESTS'
import { DoneIcon } from '@/src/utils/Icons'
import { useEffect, useState } from 'react'

export default function TestsPicker({
  tests,
  setTests = (tests) => {
    console.log(tests)
  },
  disabled = false
}) {
  const [form, setForm] = useState([])
  const handleAddTest = (test) => {
    if (testsAlreadyExist(test)) {
      const cleaned = form.filter(
        ({ distance, style }) =>
          !(test.distance === distance && style === test.style)
      )
      setTests(cleaned)
      setForm(cleaned)
    } else {
      setTests([...form, test])
      setForm([...form, test])
    }
  }

  useEffect(() => {
    if (tests) {
      setForm(tests)
    }
    return () => {
      setForm([])
    }
  }, [tests])

  const testsAlreadyExist = (test) => {
    return !!form.find(
      ({ distance, style }) =>
        distance === test.distance && style === test.style
    )
  }
  return (
    <div className="flex w-full">
      <div className="flex flex-col w-24">
        <Cell style="title">Estilo Distancia</Cell>
        {DISTANCES.map(({ id, label: distance }) => (
          <Cell key={id} style="small">
            {distance}
          </Cell>
        ))}
      </div>
      {STYLES.map(({ id: styleId, largeLabel }) => (
        <div key={styleId} className="flex flex-col w-1/6 ">
          <Cell>{largeLabel}</Cell>
          {DISTANCES.map(({ id, label: distance }) => (
            <Cell style="small" key={id}>
              <button
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault()
                  handleAddTest({ distance, style: styleId })
                }}
              >
                {testsAlreadyExist({ distance, style: styleId }) ? (
                  <DoneIcon />
                ) : (
                  'o'
                )}
              </button>
            </Cell>
          ))}
        </div>
      ))}
    </div>
  )
}
const Cell = ({ children, style = 'normal' }) => {
  const styling = {
    title: `font-bold h-12`,
    normal: `h-12`,
    small: `h-8`
  }
  return (
    <div
      className={`
    ${styling[style]} w-full  flex justify-center items-center`}
    >
      {children}
    </div>
  )
}
/*  <div className="grid grid-flow-col">
        {DISTANCES.map(({ id, label }) => (
          <div key={id}>{label}</div>
        ))}
      </div>
      <div className="grid grid-flow-row">
        {STYLES.map(({ id, label }) => (
          <div key={id}>
            {label}
          </div>
        ))}
      </div> */
