'use client'

import { useId } from 'react'
import { FiCheck } from 'react-icons/fi'
import type { SchoolGender } from '@/lib/school'

const OPTIONS: Array<{ value: SchoolGender; label: string }> = [
  { value: 'varonil', label: 'Varonil' },
  { value: 'femenil', label: 'Femenil' },
  { value: 'otro', label: 'Otro' },
]

export default function GenderSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: SchoolGender
  onChange: (value: SchoolGender) => void
  disabled?: boolean
}) {
  const name = useId()
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-(--c-ocean)">Rama / género</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-(--c-border) bg-white px-2 text-sm font-semibold text-(--c-ocean) transition-colors peer-checked:border-(--c-ocean) peer-checked:bg-(--c-ocean) peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--c-ocean) peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
              {value === option.value && <FiCheck aria-hidden="true" size={14} />}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
