import Icon from "@comps/Icon"
import ButtonIcon from "@comps/Inputs/Button/ButtonIcon"
import Link from "@comps/Link"
import Modal from "@comps/Modal"
import { useState } from 'react'

export default function EmergencyCall({ contact }) {
    const [open, setOpen] = useState()
    const handleOpen = () => {
        setOpen(!open)
    }
    return (
        <>
            <ButtonIcon
                iconName={'emergency'}
                className="btn-circle btn-sm text-error"
                onClick={handleOpen}
            />
            <Modal open={open} handleOpen={handleOpen} title="Llamada de emergencia">
                <div className="w-[90%] min-h-[10rem] flex justify-center items-center">
                    <div>
                        <p>
                            Llamar a{' '}
                            <span className="font-bold text-lg">{contact?.name}</span>
                        </p>
                        <div className="flex justify-center text-error">
                            <Link
                                href={`tel:${contact?.phone}`}
                                className="btn btn-circle btn-warning"
                            >
                                <Icon name="phone" size="xl" />
                            </Link>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}