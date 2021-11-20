import { TrashBinIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import DeleteModal from '@comps/Modals/DeleteModal'
import Modal from '@comps/Modals/Modal'
import { useState } from 'react'

export default function ModalAdminOptions({
  id,
  test,
  athlete,
  closeDetails = () => {}
}) {
  const [openDelete, setOpenDelete] = useState(false)
  const handleOpenDelete = () => {
    setOpenDelete(!openDelete)
  }
  const handleDelete = () => {
    closeDetails()
    console.log(`delete`, id)
    removeEventResult(id)
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  const [openAwardModal, setOpenAwardModal] = useState(false)
  const handleOpenAwardModal = () => {
    setOpenAwardModal(!openAwardModal)
  }

  return (
    <>
      <div className="grid gap-4">
        <Button variant="secondary" onClick={handleOpenAwardModal}>
          Premiar
        </Button>
        <Button size="md" variant="danger" onClick={handleOpenDelete}>
          Borrar
          <TrashBinIcon />
        </Button>
      </div>
      <Modal
        open={openAwardModal}
        handleOpen={handleOpenAwardModal}
        title="Premiar"
      ></Modal>
      <DeleteModal
        open={openDelete}
        handleOpen={handleOpenDelete}
        handleDelete={handleDelete}
        text={''}
      >
        <div className="text-base">
          <h3>Eliminar prueba </h3>
          <div className="border my-6">
            <p>{`${test?.distance || ''} ${test?.style || ''}`}</p>
            <p>{`  ${athlete.name || ''} ${athlete.lastName || ''}`}</p>
            <p className="text-2xl font-thin m-2">{`  ${
              test.record || ''
            } `}</p>
          </div>
        </div>
      </DeleteModal>
    </>
  )
}
