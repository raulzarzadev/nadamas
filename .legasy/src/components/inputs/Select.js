import { WarningIcon } from '@/legasy/src/utils/Icons'
import s from './styles.module.css'

export default function Select({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  type,
  children,
  helperText,
  ...rest
}) {
  return (
    <label className={s.input_label}>
      {label && `${label} :`}
      <select
        type={type}
        className={s.select_input}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        fullwidth="true"
        {...rest}
      >
        {children}
      </select>
      {error && <span className={s.error}>{error}</span>}
      {helperText && (
        <span className={s.helperText}>
          <WarningIcon size="1rem" />
          <div>{helperText}</div>
        </span>
      )}
    </label>
  )
}
