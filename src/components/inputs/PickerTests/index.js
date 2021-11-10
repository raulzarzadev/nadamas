import { DISTANCES, STYLES } from '@/src/constants/SWIMMING_TESTS'
import { DoneIcon } from '@/src/utils/Icons'
import { useEffect, useState } from 'react'

export default function PickerTests({
  tests,
  setTests = (tests) => {},
  onTestClick = () => {},
  disabled = false,
  compact = false
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
    <div className="flex w-full p-1 max-w-md mx-auto">
      <div className="flex flex-col w-16">
        <Cell size={compact && 'sm'} style="title">
          Estilo Distancia
        </Cell>
        {DISTANCES.map(({ id, label: distance }) => (
          <Cell key={id} style="small" size={compact && 'sm'}>
            {distance}
          </Cell>
        ))}
      </div>
      {STYLES.map(({ id: styleId, label, largeLabel }) => (
        <div key={styleId} className="flex flex-col w-1/6 ">
          <Cell size={compact && 'sm'} style='title'>
            <div className="hidden sm:block">{largeLabel}</div>
            <div className="sm:hidden">{label}</div>
          </Cell>
          {DISTANCES.map(({ id, label: distance }) => (
            <Cell size={compact && 'sm'} style="small" key={id}>
              <button
                className="w-full h-full p-1 flex justify-center items-center"
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault()
                  handleAddTest({ distance, style: styleId })
                }}
              >
                <div
                  className="w-full h-full flex justify-center items-center"
                  onClick={(e) => {
                    e.preventDefault()
                    onTestClick({ distance, style: styleId })
                    
                  }}
                >
                  {testsAlreadyExist({ distance, style: styleId }) ? (
                    <DoneIcon />
                  ) : (
                    'o'
                  )}
                </div>
              </button>
            </Cell>
          ))}
        </div>
      ))}
    </div>
  )
}
const Cell = ({ children, style = 'normal', size = 'md' }) => {
  const styling = {
    title: `font-bold  text-xs `,
    normal: ``,
    small: ``
  }
  const sizign = {
    sm: `h-6`,
    md: `h-8`,
    lg: `h-12`
  }
  return (
    <div
      className={`
    ${styling[style]} ${sizign[size]} w-full  flex justify-center items-center`}
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
