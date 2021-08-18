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
  ...rest
}) {

  return (
      <span className={s.input_label}>
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
        <em>{error}</em>
      </span>
  )
}
