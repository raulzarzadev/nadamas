import { DownIcon, ForwardIcon } from '@/src/utils/Icons'
import { useState } from 'react'

export default function Section({ title, children, open, indent = true }) {
  const [show, setShow] = useState(open || false)
  useState(() => {
    setShow(open)
  }, [open])
  return (
    <section className="my-2  ">
      <h3
        className="text-left flex ml-2 mb-4 font-bold bg-gray-600 sticky top-20 "
        onClick={() => setShow(!show)}
      >
        {title}
        {show ? <DownIcon /> : <ForwardIcon />}
      </h3>
      <div className={`${indent && 'pl-6'}`}>{show && children}</div>
    </section>
  )
}
