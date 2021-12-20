import { DISTANCES, STYLES } from '@/src/CONSTANTS/SWIMMING_TESTS'
import { DoneIcon } from '@/src/utils/Icons'
import { useEffect, useState } from 'react'

export default function PickerTests({
  tests,
  setTests = (tests) => {},
  onTestClick = () => {},
  disabled = false,
  compact = true,
  currentSelected = null
}) {
  const isCurrentlySelected = (test) => {
    const distance = currentSelected?.distance
    const style = currentSelected?.style
    
    return distance === test?.distance && style === test?.style
  }
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
        <Cell size={compact ? 'md' : 'lg'} style="title">
          <div className="flex flex-col">
            <span className="text-right text-xs sm:text-sm">Estilo</span>
            <span className="text-right text-xs sm:text-sm">Distancia</span>
          </div>
        </Cell>
        {DISTANCES.map(({ id, label: distance }) => (
          <Cell key={id} style="small" size={compact ? 'sm' : 'lg'}>
            {distance}
          </Cell>
        ))}
      </div>
      {STYLES.map(({ id: styleId, label, largeLabel }) => (
        <div key={styleId} className="flex flex-col w-1/6 ">
          <Cell size={compact ? 'md' : 'lg'} style="title">
            <div className="hidden sm:block">{largeLabel}</div>
            <div className="sm:hidden">{label}</div>
          </Cell>
          {DISTANCES.map(({ id, label: distance }) => (
            <Cell size={compact ? 'sm' : 'lg'} style="small" key={id}>
              <button
                className="w-full h-full p-1 flex justify-center items-center"
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault()
                  handleAddTest({ distance, style: styleId })
                }}
              >
                <div
                  className={`w-full h-full flex justify-center items-center ${
                    isCurrentlySelected({ distance, style: styleId }) &&
                    'border-2'
                  }`}
                  onClick={(e) => {
                    e.preventDefault()
                    onTestClick({ distance, style: styleId })
                  }}
                >
                  {testsAlreadyExist({ distance, style: styleId }) ? (
                    <DoneIcon size="1rem" />
                  ) : (
                    'x'
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
    title: `font-bold  text-sm`,
    normal: `font-normal`
  }
  const sizign = {
    sm: `h-6 text-xs`,
    md: `h-8 text-sm`,
    lg: `h-10`
  }
  return (
    <div
      className={`
    ${styling[style]} ${sizign[size]} w-full  flex justify-center items-center `}
    >
      {children}
    </div>
  )
}
