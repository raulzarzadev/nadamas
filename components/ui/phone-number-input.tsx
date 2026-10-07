'use client'

import { useState } from 'react'
import PhoneInput, {
  type Country,
  isPossiblePhoneNumber,
  parsePhoneNumber,
} from 'react-phone-number-input'
import labels from 'react-phone-number-input/locale/es.json'
import 'react-phone-number-input/style.css'
import styles from './phone-number-input.module.css'

function CountryFlag({ country }: { country: Country }) {
  const flag = String.fromCodePoint(...[...country].map((letter) => 127397 + letter.charCodeAt(0)))
  return (
    <span aria-hidden="true" className="text-xl leading-none">
      {flag}
    </span>
  )
}

/** International phone field shared by forms. Values use the E.164 format. */
export default function PhoneNumberInput({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  defaultCountry = 'MX',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  defaultCountry?: Country
}) {
  const [touched, setTouched] = useState(false)
  const normalized = value ? parsePhoneNumber(value, defaultCountry)?.number || value : undefined
  const invalid = touched && Boolean(value) && !isPossiblePhoneNumber(value)
  return (
    <div className="grid min-w-0 gap-1">
      <PhoneInput
        id={id}
        name={id}
        className={styles.field}
        labels={labels}
        defaultCountry={defaultCountry}
        countryOptionsOrder={['MX', 'US', 'CA', '...']}
        addInternationalOption={false}
        international
        countryCallingCodeEditable={false}
        flagComponent={CountryFlag}
        value={normalized}
        onChange={(next) => onChange(next || '')}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        required={required}
        autoComplete="tel"
        placeholder="Número de teléfono"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        countrySelectProps={{ 'aria-label': 'País del número de teléfono' }}
      />
      {invalid && (
        <p id={`${id}-error`} className="text-xs font-normal text-rose-700">
          Revisa el número y el código de país.
        </p>
      )}
    </div>
  )
}
