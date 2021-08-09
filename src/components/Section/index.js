import { DownIcon, ForwardIcon } from "@/src/utils/Icons"
import { useState } from "react"

export default function Section({ title, children, open }) {
  const [show, setShow] = useState(open || false)
  useState(() => {
    setShow(open)
  }, [open])
  return (
    <section className="my-2 ">
      <h3 className="text-left flex ml-4 mb-4" onClick={() => setShow(!show)}>
        {title}
        {show ? <DownIcon /> : <ForwardIcon />}
      </h3>
      {show && children}
    </section>
  )
}
