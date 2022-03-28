import ButtonIcon from './ButtonIcon'

export default function ButtonSave({ saved = false, ...rest }) {
  return (
    <ButtonIcon
      label={saved ? 'Guardado' : 'Guardar'}
      iconName="save"
      {...rest}
    />
  )
}
