'use client'

import { useId } from 'react'
import { TextAreaField, TextField } from '@/components/Inputs/FormFields'
import DateInput from '@/components/ui/date-input'
import EmailInput from '@/components/ui/email-input'
import GenderSelector from '@/components/ui/gender-selector'
import PhoneNumberInput from '@/components/ui/phone-number-input'
import type { SchoolGender } from '@/lib/school'

export interface PersonData {
  name: string
  phone?: string
  email?: string
  birthDate?: string
  gender?: SchoolGender
  bio?: string
}

/** Shared personal fields; callers own validation, submission and domain-specific data. */
export default function PersonFields<T extends PersonData>({
  value,
  onChange,
  fields = ['name', 'phone', 'birthDate', 'gender'],
  required = ['name'],
  disabled = false,
}: {
  value: T
  onChange: (value: T) => void
  fields?: Array<keyof PersonData>
  required?: Array<keyof PersonData>
  disabled?: boolean
}) {
  const id = useId()
  const change = (field: keyof PersonData, next: string) => onChange({ ...value, [field]: next })
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {fields.includes('name') && (
        <TextField
          label="Nombre completo"
          name="name"
          autoComplete="name"
          required={required.includes('name')}
          minLength={2}
          maxLength={120}
          value={value.name}
          onChange={(event) => change('name', event.target.value)}
          disabled={disabled}
        />
      )}
      {fields.includes('phone') && (
        <div className="grid min-w-0 gap-1">
          <label htmlFor={`${id}-phone`} className="text-sm font-semibold text-(--c-ocean)">
            Teléfono
          </label>
          <PhoneNumberInput
            id={`${id}-phone`}
            value={value.phone || ''}
            onChange={(phone) => change('phone', phone)}
            required={required.includes('phone')}
            disabled={disabled}
          />
        </div>
      )}
      {fields.includes('email') && (
        <div className="grid min-w-0 gap-1">
          <label htmlFor={`${id}-email`} className="text-sm font-semibold text-(--c-ocean)">
            Correo electrónico
          </label>
          <EmailInput
            id={`${id}-email`}
            name="email"
            value={value.email || ''}
            onChange={(email) => change('email', email)}
            required={required.includes('email')}
            disabled={disabled}
          />
        </div>
      )}
      {fields.includes('birthDate') && (
        <DateInput
          label="Fecha de nacimiento"
          name="birthDate"
          value={value.birthDate || ''}
          onChange={(birthDate) => change('birthDate', birthDate)}
          required={required.includes('birthDate')}
          disabled={disabled}
          max={new Date().toLocaleDateString('en-CA')}
        />
      )}
      {fields.includes('gender') && (
        <GenderSelector
          value={value.gender || 'otro'}
          onChange={(gender) => change('gender', gender)}
          disabled={disabled}
        />
      )}
      {fields.includes('bio') && (
        <TextAreaField
          label="Presentación"
          name="bio"
          rows={3}
          value={value.bio || ''}
          onChange={(event) => change('bio', event.target.value)}
          required={required.includes('bio')}
          disabled={disabled}
        />
      )}
    </div>
  )
}
