import Button from '@/legasy/src/components/inputs/Button'
import Modal from '../Modal'
import { useState } from 'react'
export default function DeleteModal({
  open,
  handleOpen,
  name,
  handleDelete,
  text = 'De verdad quieres eliminar a este atleta',
  title = 'Eliminar',
  children
}) {
  const [textButton, setTextButton] = useState('Eliminar')

  return (
    <Modal handleOpen={handleOpen} open={open} title={title}>
      <p className="my-2 ">{name}</p>
      <p className="my-2 text-sm">{text}</p>
      {children}
      <Button
        variant="danger"
        p="2"
        my="md"
        onClick={() => {
          handleDelete()
          setTextButton('Eliminando')
          setTimeout(() => {
            handleOpen()
            setTextButton('Eliminar')
          }, 400)
        }}
      >
        {textButton}
      </Button>
    </Modal>
  )
}
