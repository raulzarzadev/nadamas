import s from './styles.module.css'

export default function Textarea({
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
      {label && value && `${label} :`}
      <textarea
      
        className={`${s.text_input} ${s.text_area}`}
        placeholder={label}
        name={name}
        value={value}
        onChange={onChange}
        {...rest}
      >
        {children}
      </textarea>
      <em>{error}</em>
    </span>
  )
}
