import { ROUTES } from "@/CONSTANTS/ROUTES"
import { useUser } from "@/context/UserContext"
import { format } from "@/utils/dates"
import PickerTests from "@comps/Inputs/PickerTests"
import Link from "@comps/Link"
import MainModal from "@comps/Modal/MainModal"
import Section from "@comps/Section"
import Image from "next/image"

const Event = ({ event }) => {
  const { user } = useUser()
  const { title, id, date, tests, description, image, userId } = event
  const handleDeleteEvent = (id) => {
    deleteEvent(id).then(({ ok }) =>
      ok ? back() : console.error('error'))
  }

  const isOwner = user.id === userId

  console.log(isOwner)

  return (
    <div>
      <div>

        {image && <div className="relative w-full aspect-video mx-auto">
          <Image src={image} layout="fill" objectFit="cover" />
        </div>}
        {isOwner &&
          <Section title='Admin'>
            <div className="grid-flow-col grid gap-2 overflow-auto">
              <Link className={'btn btn-info '} href={`${ROUTES.EVENTS.href}/${id}/edit`}>
                Editar
              </Link>
              <MainModal title="Eliminar evento" buttonLabel="Eliminar" OpenComponentType='delete' >
                <div className="flex flex-col h-full items-center justify-center">
                  <div>
                    Elimnar evento
                  </div>
                  <button className="btn btn-error" onClick={() => handleDeleteEvent(id)}>
                    Eliminar
                  </button>
                </div>
              </MainModal>
            </div>
          </Section>
        }
        <h2 className="text-center font-bold text-xl uppercase">{title}</h2>
        <p className="text-center">{format(date, 'dd MMM yy')}</p>
        <p className="whitespace-pre-line">
          {description}
        </p>
        <div>

        </div>

        <div>
          <h3 className="text-center">Pruebas {` (${tests?.length || 0})`}</h3>
          <PickerTests tests={tests} disabled={true} />
        </div>

      </div>
    </div>
  )
}

export default Event