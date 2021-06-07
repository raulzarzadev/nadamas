import Button from '@/src/Button'
import { CallIcon } from '@/src/utils/Icons'
import Modal from '../Modal'
import s from './styles.module.css'

export default function EmergencyCallModal({ contact, handleOpen, open }) {
  const { emerTitle, emerName, emerMobile = null, name } = contact
  return (
    <Modal handleOpen={handleOpen} open={open} title="Llamada de emergencia">
      <div>
        {emerMobile ? (
          <>
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
          </>
        ) : (
          <>
            <strong>{emerName}</strong>
            {` Aun no tiene contacto de emergencia. `}
            <strong>Pidelo</strong>
          </>
        )}
      </div>
    </Modal>
  )
}
