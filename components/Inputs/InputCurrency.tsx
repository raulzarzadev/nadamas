'use client'

import { useEffect, useState } from 'react'

interface InputCurrencyProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  valueCents: number | null
  onChange: (valueCents: number | null) => void
  placeholder?: string
  className?: string
}

function formatCurrency(valueCents: number | null) {
  if (valueCents === null) return ''
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(valueCents / 100)
}

function parseCurrency(raw: string) {
  const normalized = raw.replace(/[^\d.,]/g, '').replace(',', '.')
  if (!normalized) return null
  const pesos = Number(normalized)
  if (!Number.isFinite(pesos)) return null
  return Math.round(pesos * 100)
}

export default function InputCurrency({
  valueCents,
  onChange,
  placeholder = '$ 99.00',
  className = '',
  ...props
}: InputCurrencyProps) {
  const [text, setText] = useState(formatCurrency(valueCents))
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) setText(formatCurrency(valueCents))
  }, [isFocused, valueCents])

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onFocus={() => {
        setIsFocused(true)
        setText(valueCents === null ? '' : (valueCents / 100).toFixed(2))
      }}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        onChange(parseCurrency(next))
      }}
      onBlur={() => {
        setIsFocused(false)
        setText(formatCurrency(valueCents))
      }}
      className={className}
      {...props}
    />
  )
}
