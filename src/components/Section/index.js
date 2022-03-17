import { DownIcon, ForwardIcon } from '@/src/utils/Icons'
import { useState } from 'react'

export default function Section({
  title,
  subtitle,
  children,
  open,
  indent = true,
  sticky = false
}) {
  const [show, setShow] = useState(open || false)
  useState(() => {
    setShow(open)
  }, [open])
  return (
    <section className="my-2 dark:bg-primary dark:bg-opacity-5 shadow-lg px-1">
      <h3
        className={`
        text-left flex pl-2 mb-4 font-bold items-center   
        ${sticky && `sticky top-16`}`}
        onClick={() => setShow(!show)}
      >
        {title} <span className='font-thin  text-xs mx-2'>{subtitle}</span>
        {show ? <DownIcon /> : <ForwardIcon />}
      </h3>
      <div className={`${indent && 'pl-6 '} `}>{show && children}</div>
    </section>
  )
}
