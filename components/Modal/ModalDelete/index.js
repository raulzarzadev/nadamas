import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Modal from '..'
import { useState } from 'react'
import Button from '@comps/Inputs/Button'

export default function ModalDelete({
  handleDelete = null,
  deleteSuccessful = () => { },
  labelDelete,
  itemId = '',
  buttonVariant = 'circle', // btn | outline | circle
  buttonLabel = null,
  buttonSize = 'xs',
  deleteParagraph = null,
  OpenComponent = null,
  onClick,
  ...props
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
      <div>
        {OpenComponent
          ?
          <OpenComponent onClick={(e) => {
            e.preventDefault()
            handleOpen()
          }} {...props} />
          :
          <ButtonIcon
            id='delete-modal'
            iconName={'trash'}
            onClick={(e) => {
              e.preventDefault()
              handleOpen()
            }}
            size={buttonSize}
            label={buttonLabel}
            variant={buttonVariant}
            className=""
          />
        }
      </div>
      <Modal title="Eliminar" open={open} handleOpen={handleOpen}>
        <div>
          <p>{deleteParagraph || '¿Estás seguro de eliminar este elemento?'}</p>
          {labelDelete && <p className="text-center my-6">{labelDelete}</p>}
          <div className="w-full justify-center flex my-4 ">
            <Button
              className={'btn-outline m-1'}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleOpen()
              }}
            >
              Cancelar
            </Button>
            <Button
              id='handle-delete-modal-button'
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
