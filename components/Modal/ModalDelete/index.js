import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Modal from '..'
import { useState } from 'react'
import Button from '@comps/Inputs/Button'

export default function ModalDelete({
  handleDelete = null,
  deleteSuccessful = () => {},
  labelDelete,
  itemId = '',
  buttonVariant = 'circle',
  buttonLabel = null,
  buttonSize = 'xs'
}) {
  const [open, setOpen] = useState()
  const handleOpen = () => {
    setOpen(!open)
  }
  const [loading, setLoading] = useState(false)
  const [buttonLabelModal, setButtonLabelModal] = useState('Eliminar')

  const functionDelete = async () => {
    setLoading(true)
    setButtonLabelModal('Eliminando')

    const deleteFunc = async () => {
      try {
        await handleDelete(itemId)
      } catch (error) {
        throw new Error(error)
      } finally {
        setLoading(false)
        setButtonLabelModal('Eliminado')
        deleteSuccessful()
        setTimeout(() => {
          setButtonLabelModal('Eliminar')
        }, 1000)
      }
    }
    deleteFunc()
    /*  handleDelete(itemId).then((res) => {
      console.log(res)
      setLoading(false)
      if (res.ok) {
        setButtonLabelModal('Eliminado')
        deleteSuccessful()
      } else {
        setButtonLabelModal('Error')
        setTimeout(() => {
          setButtonLabelModal('Eliminar')
        }, 1000)
      } */
    /*  }) */
  }
  return (
    <div>
      <ButtonIcon
        iconName={'trash'}
        onClick={handleOpen}
        size={buttonSize}
        label={buttonLabel}
        variant={buttonVariant}
      />
      <Modal title="Eliminar" open={open} handleOpen={handleOpen}>
        <div>
          <p className="text-center my-6">Eliminar de forma permanente</p>
          {labelDelete && <p className="text-center my-6">{labelDelete}</p>}
          <div className="w-full justify-center flex my-4 ">
            <Button
              className={'btn-outline m-1'}
              onClick={() => {
                handleOpen()
              }}
            >
              Cancelar
            </Button>
            <Button
              className={'btn-error m-1 '}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDelete && functionDelete()
              }}
            >
              {buttonLabelModal}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
