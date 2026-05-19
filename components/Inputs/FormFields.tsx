'use client'

import InputCurrency from '@comps/Inputs/InputCurrency'
import PhoneInput from '@comps/Inputs/PhoneInput'
import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react'

const labelClassName = 'text-sm font-semibold text-[var(--c-ocean)]'
const helperClassName = 'text-sm text-[var(--c-text-2)]'
const controlClassName =
  'h-14 w-full rounded-2xl border border-[var(--c-border)] bg-white px-5 font-semibold text-[var(--c-ocean)] shadow-[var(--shadow-sm)] outline-none transition placeholder:text-[rgba(75,85,99,0.68)] focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--c-aqua)_18%,transparent)]'

interface FieldShellProps {
  id: string
  label: string
  helperText?: string
  hideLabel?: boolean
  children: ReactNode
}

function FieldShell({ id, label, helperText, hideLabel = false, children }: FieldShellProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5">
      <span className={hideLabel ? 'sr-only' : labelClassName}>{label}</span>
      {children}
      {helperText && <span className={helperClassName}>{helperText}</span>}
    </label>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
  hideLabel?: boolean
}

export function TextField({
  id,
  label,
  helperText,
  hideLabel,
  className = '',
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell id={fieldId} label={label} helperText={helperText} hideLabel={hideLabel}>
      <input id={fieldId} className={`${controlClassName} ${className}`} {...props} />
    </FieldShell>
  )
}

type SearchFieldProps = Omit<TextFieldProps, 'type'> & {
  hideLabel?: boolean
}

export function SearchField({ hideLabel = true, ...props }: SearchFieldProps) {
  return <TextField type="search" hideLabel={hideLabel} {...props} />
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  helperText?: string
  hideLabel?: boolean
}

export function TextAreaField({
  id,
  label,
  helperText,
  hideLabel,
  className = '',
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell id={fieldId} label={label} helperText={helperText} hideLabel={hideLabel}>
      <textarea
        id={fieldId}
        rows={rows}
        className={`${controlClassName} min-h-28 resize-y py-4 ${className}`}
        {...props}
      />
    </FieldShell>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  helperText?: string
  hideLabel?: boolean
}

export function SelectField({
  id,
  label,
  helperText,
  hideLabel,
  className = '',
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell id={fieldId} label={label} helperText={helperText} hideLabel={hideLabel}>
      <select id={fieldId} className={`${controlClassName} ${className}`} {...props}>
        {children}
      </select>
    </FieldShell>
  )
}

type NativeInputFieldProps = Omit<TextFieldProps, 'type'>

export function DateField(props: NativeInputFieldProps) {
  return <TextField type="date" {...props} />
}

interface SwitchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  helperText?: string
}

export function SwitchField({ label, helperText, className = '', ...props }: SwitchFieldProps) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input id={id} type="checkbox" className={`toggle mt-0.5 ${className}`} {...props} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className={labelClassName}>{label}</span>
        {helperText && <span className={helperClassName}>{helperText}</span>}
      </span>
    </label>
  )
}

export function TimeField(props: NativeInputFieldProps) {
  return <TextField type="time" {...props} />
}

interface MoneyFieldProps {
  label: string
  helperText?: string
  valueCents: number | null
  onChange: (valueCents: number | null) => void
  placeholder?: string
  className?: string
}

export function MoneyField({
  label,
  helperText,
  valueCents,
  onChange,
  placeholder,
  className = '',
}: MoneyFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} helperText={helperText}>
      <InputCurrency
        id={id}
        valueCents={valueCents}
        onChange={onChange}
        placeholder={placeholder}
        className={`${controlClassName} text-lg ${className}`}
      />
    </FieldShell>
  )
}

interface PhoneFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  helperText?: string
  error?: string
  placeholder?: string
  required?: boolean
  name?: string
}

export function PhoneField({ helperText, ...props }: PhoneFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <PhoneInput {...props} />
      {helperText && <span className={helperClassName}>{helperText}</span>}
    </div>
  )
}
