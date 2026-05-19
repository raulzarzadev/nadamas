'use client'

import InputCurrency from '@comps/Inputs/InputCurrency'
import { type ReactNode, useId } from 'react'

const labelClassName = 'text-sm font-semibold text-[var(--c-ocean)]'
const helperClassName = 'text-sm text-[var(--c-text-2)]'
const controlClassName =
  'h-14 w-full rounded-2xl border border-[var(--c-border)] bg-white px-5 font-semibold text-[var(--c-ocean)] shadow-[var(--shadow-sm)] outline-none transition placeholder:text-[rgba(75,85,99,0.68)] focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--c-aqua)_18%,transparent)]'

interface FieldShellProps {
  id: string
  label: string
  helperText?: string
  children: ReactNode
}

function FieldShell({ id, label, helperText, children }: FieldShellProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5">
      <span className={labelClassName}>{label}</span>
      {children}
      {helperText && <span className={helperClassName}>{helperText}</span>}
    </label>
  )
}

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
}

export function TextField({ label, helperText, className = '', ...props }: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} helperText={helperText}>
      <input id={id} className={`${controlClassName} ${className}`} {...props} />
    </FieldShell>
  )
}

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  helperText?: string
}

export function TextAreaField({
  label,
  helperText,
  className = '',
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} helperText={helperText}>
      <textarea
        id={id}
        rows={rows}
        className={`${controlClassName} min-h-28 resize-y py-4 ${className}`}
        {...props}
      />
    </FieldShell>
  )
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  helperText?: string
}

export function SelectField({
  label,
  helperText,
  className = '',
  children,
  ...props
}: SelectFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} helperText={helperText}>
      <select id={id} className={`${controlClassName} ${className}`} {...props}>
        {children}
      </select>
    </FieldShell>
  )
}

type NativeInputFieldProps = Omit<TextFieldProps, 'type'>

export function DateField(props: NativeInputFieldProps) {
  return <TextField type="date" {...props} />
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
