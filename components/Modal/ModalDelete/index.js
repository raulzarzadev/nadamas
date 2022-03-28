import ButtonIcon from '@comps/Inputs/Button/ButtonIcon'
import Modal from '..'
import { useState } from 'react'
import Button from '@comps/Inputs/Button'

export default function ModalDelete({
  handleDelete = null,
  deleteSuccessful = () => {},
  labelDelete,
  itemId
}) {
  const [open, setOpen] = useState()
  const handleOpen = () => {
    setOpen(!open)
  }
  const [loading, setLoading] = useState(false)
  const [buttonLabel, setButtonLabel] = useState('Eliminar')

  const functionDelete = async () => {
    setLoading(true)
    handleDelete(itemId).then((res) => {
      console.log(res)
      setLoading(false)
      if (res.ok) {
        setButtonLabel('Eliminado')
        deleteSuccessful()
      } else {
        setButtonLabel('Error')
        setTimeout(() => {
          setButtonLabel('Eliminar')
        }, 1000)
      }
    })
  }
  return (
    <div>
      <ButtonIcon iconName={'trash'} onClick={handleOpen} size="xs" circle />
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
              {buttonLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
