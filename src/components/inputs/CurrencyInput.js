import ReactCurrencyInput from 'react-currency-input-field'

import s from './styles.module.css'
function CurrencyInput({
  label,
  value,
  error,
  id = 'currrency-input',
  name = 'currrency-input',
  placeholder = 'Please enter a number',
  defaultValue = 1000,
  decimalsLimit = 2,
  handleChange,
  ...rest
}) {
  return (
    <span className={s.input_label}>
      {label && value && `${label} :`}
      <div className={s.icon_container}>
        <ReactCurrencyInput
          prefix="$"
          className={s.text_input}
          placeholder={placeholder || label}
          value={value || ''}
          id={id}
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          decimalsLimit={decimalsLimit}
          onValueChange={handleChange}
          {...rest}
        />
      </div>
      <em className={s.input_error}>{error}</em>
    </span>
  )
}

export default CurrencyInput
