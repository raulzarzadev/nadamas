import Icon from '@comps/Icon'
import { useState } from 'react'

export default function Section({
  title,
  subtitle,
  children,
  open,
  indent = false,
  sticky = false
}) {
  const [show, setShow] = useState(open || false)
  useState(() => {
    setShow(open)
  }, [open])
  return (
    <section className="my-2 bg-base-100   text-base-content shadow-lg px-1 rounded-md pb-2 pt-1 ">
      <h3
        className={`
        text-left flex pl-2 mb-4 font-bold items-center   
        ${sticky && `sticky top-16`}`}
        onClick={() => setShow(!show)}
      >
        {title} <span className="font-thin  text-xs mx-2">{subtitle}</span>
        {show ? <Icon name="down" /> : <Icon name="right" />}
      </h3>
      <div className={`${indent && 'pl-6 '} `}>{show && children}</div>
    </section>
  )
}
