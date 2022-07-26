import ButtonIcon from './ButtonIcon'

export default function ButtonSave({ saved = false, disabled, savedLabel = 'Guardado', label = 'Guardar', ...rest }) {
  return (
    <ButtonIcon
      label={saved ? savedLabel : label}
      disabled={disabled || saved}
      iconName="save"
      {...rest}
    />
  )
}
