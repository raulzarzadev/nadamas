import { SaveIcon } from '@/legasy/src/utils/Icons'
import Button from '../Button'

export default function ButtonSave({ status = 'clean', onClick = () => {} ,...rest}) {
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
      label: 'Guardado',
      disabled: true,
      icon: <SaveIcon />
    }
  }
  return (
      <Button onClick={onClick} disabled={BUTTON_STATUS[status]?.disabled} {...rest}>
        {BUTTON_STATUS[status]?.label} {BUTTON_STATUS[status]?.icon}
      </Button>
  )
}
