import Modal from "."
import { useState, useRef } from 'react'
import ButtonIcon from "@comps/Inputs/Button/ButtonIcon"

export default function MainModal({ children, title = "Opening modal", buttonLabel = 'open modal', OpenComponent, OpenComponentProps }) {

    const [openModal, setOpenModal] = useState(false)
    const modalRef = useRef(null)
    const handleOpenModal = () => {
        setOpenModal(!openModal)
    }

    return <div className="">
        {OpenComponent ? <OpenComponent onClick={handleOpenModal}  {...OpenComponentProps} /> :
            <ButtonIcon fullwidth onClick={handleOpenModal} variant='info' size='xs' iconName={'edit'} label={buttonLabel} />
        }
        <div className="absolute">
            <Modal ref={modalRef} title={title} open={openModal} handleOpen={handleOpenModal} >
                {children}
            </Modal>
        </div>
    </div>
}