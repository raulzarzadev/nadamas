import { CloseBackIcon } from '@/src/utils/Icons'
import s from './styles.module.css'

export default function Text({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  type = 'text',
  children,
  Icon,
  onClickIcon,
  ...rest
}) {
  return (
    <span className={s.input_label}>
      {label && value && `${label} :`}
      <div className={s.icon_container}>
        <input
          type={type}
          className={s.text_input}
          placeholder={placeholder || label}
          name={name}
          value={value || ''}
          onChange={onChange}
          {...rest}
        >
          {children}
        </input>
        {Icon && (
          <button className={s.icon} onClick={onClickIcon}>
            <Icon />
          </button>
        )}
      </div>
      <em className={s.input_error}>{error}</em>
    </span>
  )
}
