import { CallIcon } from '@/src/utils/Icons'
import Button from '@comps/inputs/Button'
import router from 'next/router'
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
            <Button
              variant="danger"
              onClick={() => router.push(`tel:+52${emerMobile}`)}
            >
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
