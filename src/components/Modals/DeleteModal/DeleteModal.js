import Button from '@comps/inputs/Button'
import Modal from '../Modal'
import s from './styles.module.css'

export default function DeleteModal({
  open,
  handleOpen,
  name,
  handleDelete,
  text = 'De verdad quieres eliminar a este atleta',
  title = 'Eliminar Nadador'
}) {
  return (
    <Modal handleOpen={handleOpen} open={open} title={title}>
      <p className="my-2 ">{name}</p>
      <p className="my-2 text-sm">{text}</p>
      <Button variant="danger" p="2" my="md" onClick={handleDelete}>
        Eliminar
      </Button>
    </Modal>
  )
}
