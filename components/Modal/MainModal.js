import Modal from "."
import { useState } from 'react'
import ButtonIcon from "@comps/Inputs/Button/ButtonIcon"

export default function MainModal({ children, title = "Opening modal", buttonLabel = 'open modal' }) {

    const [openModal, setOpenModal] = useState(false)
    const handleOpenModal = () => {
        setOpenModal(!openModal)
    }
    return <>
        <ButtonIcon fullwidth onClick={handleOpenModal} variant='info' size='xs' iconName={'edit'} label={buttonLabel} />

        <Modal title={title} open={openModal} handleOpen={handleOpenModal}>
            {children}
        </Modal>
    </>
}