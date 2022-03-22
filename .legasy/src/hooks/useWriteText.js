import { useEffect, useState } from 'react'

export default function useWriteText({
  step = 100,
  wordsList = [],
  unwriteFast
}) {
  const [_step, _setStep] = useState(step)
  const [text, setText] = useState('')
  const [position, setPosition] = useState(1)
  const [direction, setDirection] = useState(1)

  const [listPosition, setListPosition] = useState(0)
  const [listDirection, setListDirection] = useState(1)

  useEffect(() => {
    setTimeout(
      () => {
        const currentWord = wordsList[listPosition]
        const res = currentWord?.slice(0, position)
        if (position >= currentWord?.length ) setDirection(-1)
        if (position === 1) setDirection(1)
        setPosition(position + direction)
        setText(res)
      },
      unwriteFast && direction === -1 ? _step / 3 : _step
    )
  }, [position])

  useEffect(() => {
    if (position === 0) setListPosition(listPosition + listDirection)
    if (listPosition >= wordsList?.length) setListPosition(0)
  }, [position])

  return { text, position, direction, listDirection, listPosition }
}
