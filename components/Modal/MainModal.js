import Modal from "."
import { useState, useRef } from 'react'

export default function MainModal({
  children,
  title,
  buttonLabel = 'open modal',
  OpenComponent = null,
  OpenComponentProps = null,
  OpenComponentType = null,
  id = 'main-modal'
}) {

  const OPEN_COMPONENT_STYLE = {
    delete: `btn btn-error `,
    primary: `btn btn-primary `,
    info: `btn btn-info `,
  }
  const [openModal, setOpenModal] = useState(false)
  const modalRef = useRef(null)
  const handleOpenModal = () => {
    setOpenModal(!openModal)
  }

  return <>
    {OpenComponent ? <OpenComponent onClick={handleOpenModal}  {...OpenComponentProps} /> :
      <button
        onClick={() => handleOpenModal()}
        {...OpenComponentProps}
        className={`${OpenComponentProps?.className || ''} ${OPEN_COMPONENT_STYLE[OpenComponentType]}`}
      >
        {buttonLabel}
      </button>
    }
    <>
      <Modal ref={modalRef} title={title} id={id} open={openModal} handleOpen={handleOpenModal} >
        {children}
      </Modal>
    </>
  </>
}
