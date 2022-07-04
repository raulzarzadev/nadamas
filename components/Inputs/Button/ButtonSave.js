import ButtonIcon from './ButtonIcon'

export default function ButtonSave({ saved = false, disabled, ...rest }) {
  return (
    <ButtonIcon
      label={saved ? 'Guardado' : 'Guardar'}
      disabled={disabled || saved}
      iconName="save"
      {...rest}
    />
  )
}
