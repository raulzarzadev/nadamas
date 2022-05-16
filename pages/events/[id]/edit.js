import { listenEvent } from "@/firebase/events"
import FormEvent from "@comps/Events/FormEvent"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"

const edit = () => {
    const { query: { id: eventId } } = useRouter()
    const [event, setEvent] = useState()
    useEffect(() => {
        listenEvent(eventId, setEvent)
    }, [])
    return (
        <div>
            <h2>Editar evento</h2>
            <FormEvent event={event} />

        </div>
    )
}

export default edit