import Button from '@/src/Button'
import { CallIcon } from '@/src/utils/Icons'
import Modal from '../Modal'
import s from './styles.module.css'

export default function EmergencyCallModal({ contact, handleOpen, open }) {
  const { emerTitle, emerName, emerMobile, name } = contact
  return (
    <Modal handleOpen={handleOpen} open={open} title="Llamada de emergencia">
      <div>
        {`¿Segura quieres llamar a `}
        <strong>{emerName}</strong>
        {`, `}
        <>{emerTitle}</>
        {` de `}
        <strong>{name}</strong>
        {`? `}
        <Button my="md" danger nextLink href={`tel:+52${emerMobile}`}>
          <CallIcon />
          {` Llamar`}
        </Button>
      </div>
    </Modal>
  )
}
