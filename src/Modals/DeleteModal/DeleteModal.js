import Button from '@/src/Button'
import Modal from '../Modal'
import s from './styles.module.css'

export default function DeleteModal({ open, handleOpen, name, handleDelete }) {
  return (
    <Modal handleOpen={handleOpen} open={open} title="Eliminar Nadador">
      <div>De verdad quieres eliminar a {name}</div>
      <Button danger p="2" my="md" onClick={handleDelete}>
        Eliminar
      </Button>
    </Modal>
  )
}
