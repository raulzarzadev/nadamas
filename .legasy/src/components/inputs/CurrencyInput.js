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
   <div className=" text-left my-1 ">
      {label && value && `${label} :`}
      
        <ReactCurrencyInput
          prefix="$"
          className='bg-secondary-dark max-w-full w-full p-1 rounded-md'
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
      <em className={s.input_error}>{error}</em>
    </div>
  )
}

export default CurrencyInput
