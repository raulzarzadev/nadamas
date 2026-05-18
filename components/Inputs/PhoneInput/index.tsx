'use client'

import { useId, useMemo } from 'react'
import { FiChevronDown } from 'react-icons/fi'

interface Country {
  iso: string
  name: string
  dial: string
  flag: string
}

// Mexico first = default. Common LATAM + US/ES.
export const PHONE_COUNTRIES: Country[] = [
  { iso: 'MX', name: 'México', dial: '52', flag: '🇲🇽' },
  { iso: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸' },
  { iso: 'ES', name: 'España', dial: '34', flag: '🇪🇸' },
  { iso: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷' },
  { iso: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴' },
  { iso: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱' },
  { iso: 'PE', name: 'Perú', dial: '51', flag: '🇵🇪' },
  { iso: 'EC', name: 'Ecuador', dial: '593', flag: '🇪🇨' },
  { iso: 'GT', name: 'Guatemala', dial: '502', flag: '🇬🇹' },
  { iso: 'CR', name: 'Costa Rica', dial: '506', flag: '🇨🇷' },
  { iso: 'PA', name: 'Panamá', dial: '507', flag: '🇵🇦' },
  { iso: 'DO', name: 'Rep. Dominicana', dial: '1', flag: '🇩🇴' },
  { iso: 'UY', name: 'Uruguay', dial: '598', flag: '🇺🇾' },
  { iso: 'BO', name: 'Bolivia', dial: '591', flag: '🇧🇴' },
  { iso: 'PY', name: 'Paraguay', dial: '595', flag: '🇵🇾' },
  { iso: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪' },
]

const DEFAULT_DIAL = '52'

/**
 * Split an E.164-ish value (`+52155...`) into dial code + national digits.
 * Falls back to the default country (MX) when nothing matches.
 */
function splitValue(value: string) {
  const digits = (value || '').replace(/[^\d]/g, '')
  // Longest dial first so `593` wins over `5`.
  const dials = [...new Set(PHONE_COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length)
  const matched = dials.find((dial) => digits.startsWith(dial))
  if (matched) {
    return { dial: matched, national: digits.slice(matched.length) }
  }
  return { dial: DEFAULT_DIAL, national: digits }
}

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  placeholder?: string
  required?: boolean
  name?: string
}

export default function PhoneInput({
  value,
  onChange,
  label = 'Teléfono',
  error,
  placeholder = 'Tu teléfono',
  required,
  name,
}: PhoneInputProps) {
  const id = useId()
  const { dial, national } = useMemo(() => splitValue(value), [value])
  const current = PHONE_COUNTRIES.find((c) => c.dial === dial) || PHONE_COUNTRIES[0]

  function emit(nextDial: string, nextNational: string) {
    const cleaned = nextNational.replace(/[^\d]/g, '')
    onChange(cleaned ? `+${nextDial}${cleaned}` : '')
  }

  return (
    <div className="block">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[var(--c-text-2)]">
          {label}
        </label>
      )}

      <div
        className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-white transition focus-within:border-[var(--c-aqua)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--c-aqua)_18%,transparent)] ${
          error ? 'border-red-400' : 'border-[var(--c-border)]'
        }`}
      >
        <div className="relative flex h-full items-center">
          <span
            aria-hidden="true"
            className="pointer-events-none flex items-center px-4 text-sm font-semibold text-[var(--c-ocean)]"
          >
            <span className="text-lg leading-none">{current.flag}</span>
            <span className="ml-2">+{current.dial}</span>
            <FiChevronDown className="ml-1.5 text-[var(--c-text-2)]" />
          </span>
          <select
            aria-label="Código de país"
            value={dial}
            onChange={(event) => emit(event.target.value, national)}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent text-transparent outline-none"
          >
            {PHONE_COUNTRIES.map((country) => (
              <option key={country.iso} value={country.dial} className="text-[var(--c-ocean)]">
                {country.flag} {country.name} (+{country.dial})
              </option>
            ))}
          </select>
        </div>

        <span className="h-6 w-px shrink-0 bg-[var(--c-border)]" />

        <input
          id={id}
          name={name}
          value={national}
          onChange={(event) => emit(dial, event.target.value)}
          placeholder={placeholder}
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-[var(--c-ocean)] outline-none"
        />
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
