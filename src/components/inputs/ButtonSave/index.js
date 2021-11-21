import { SaveIcon } from '@/src/utils/Icons'
import Button from '../Button'

export default function ButtonSave({ status = 'clean', onClick }) {
  const BUTTON_STATUS = {
    clean: {
      variant: 'primary',
      label: 'Guardar',
      disabled: true,
      icon: <SaveIcon />
    },
    dirty: {
      variant: 'primary',
      label: 'Guardar',
      disabled: false,
      icon: <SaveIcon />
    },
    saved: {
      variant: 'primary',
      label: 'Guardar',
      disabled: true,
      icon: <SaveIcon />
    }
  }
  return (
    <div className="text-base">
      <Button onClick={onClick} disabled={BUTTON_STATUS[status]?.disabled}>
        {BUTTON_STATUS[status]?.label} {BUTTON_STATUS[status]?.icon}
      </Button>
    </div>
  )
}
