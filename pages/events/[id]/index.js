
import {  listenEvent } from "@/firebase/events"
import Event from "@comps/Events/Event3"
import { Head } from "@comps/Head"
import Loading from "@comps/Loading"
import { useRouter } from "next/router"
import React from "react"
import { useEffect, useState } from "react"

const event = () => {
  const { query: { id }, back } = useRouter()
  const [event, setEvent] = useState()

  useEffect(() => {
    listenEvent(id, setEvent)
  }, [])

  if (!event) return <Loading />

  return (
    <>
      <Head title={`${event?.title}`} />
      <Event event={event} />
    </>
  )
}


export default event