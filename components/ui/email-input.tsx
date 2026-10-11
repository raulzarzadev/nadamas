'use client'

import type { InputHTMLAttributes } from 'react'

type EmailInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
}

/** Shared email control. Pair with a label using the input id. */
export default function EmailInput({
  value,
  onChange,
  className = '',
  autoComplete = 'email',
  placeholder = 'nombre@correo.com',
  maxLength = 160,
  ...props
}: EmailInputProps) {
  return (
    <input
      {...props}
      type="email"
      inputMode="email"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      autoComplete={autoComplete}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`h-11 min-w-0 w-full max-w-full box-border rounded-xl border border-(--c-border) bg-white px-3 text-sm font-normal text-(--c-ocean) outline-none transition-colors placeholder:text-(--c-text-2) focus:border-(--c-ocean) focus:ring-2 focus:ring-(--c-border) disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
