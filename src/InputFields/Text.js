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
  ...rest
}) {
  return (
    <span className={s.input_label}>
      {label && `${label} :`}
      <input
        type={type}
        className={s.text_input}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        {...rest}
      >
        {children}
      </input>
      <em>{error}</em>
    </span>
  )
}
