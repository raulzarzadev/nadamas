//@ts-check
import { ROUTES } from "@/CONSTANTS/ROUTES"
import { listenEvent } from "@/firebase/events"
import { Head } from "@comps/Head"
import Link from "@comps/Link"
import Loading from "@comps/Loading"
import { useRouter } from "next/router"
import React from "react"
import { useEffect, useState } from "react"

const event = () => {
    const { query: { id } } = useRouter()
    const [event, setEvent] = useState()

    useEffect(() => {
        listenEvent(id, setEvent)
    }, [])
    console.log(event)
    if (!event) return <Loading />
    const { title, name } = event
    return (
        <>
            <Head title={`${title}`}>

            </Head>
            <div>

                Detalles de evento
                <h2 className="text-center font-bold text-xl uppercase">{title}</h2>
                <div>
                    <h3>Admin</h3>
                    <div>
                        <Link className={'btn btn-info '} href={`${ROUTES.EVENTS.href}/${id}/edit`}>
                            Editar
                        </Link>
                    </div>
                </div>

            </div>
        </>
    )
}


export default event