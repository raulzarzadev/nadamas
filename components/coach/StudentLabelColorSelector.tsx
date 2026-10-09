'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FiCheck } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { STUDENT_LABEL_COLORS, studentLabelColor } from '@/lib/student-label-colors'

export default function StudentLabelColorSelector({
  value,
  onChange,
  disabled,
  modal = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  modal?: boolean
}) {
  const [open, setOpen] = useState(false)
  if (modal)
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="btn btn-outline min-h-11 shrink-0 gap-2 border px-3 text-sm"
          aria-label="Seleccionar color de la etiqueta"
        >
          <span
            aria-hidden="true"
            className="size-4 rounded-full"
            style={{ backgroundColor: studentLabelColor(value).color }}
          />{' '}
          Color
        </button>
        {open &&
          createPortal(
            <Sheet open onClose={() => setOpen(false)} label="Seleccionar color">
              <div className="grid gap-3 pb-4">
                <h2 className="text-xl font-bold">Seleccionar color</h2>
                <StudentLabelColorSelector
                  value={value}
                  onChange={(color) => {
                    onChange(color)
                    setOpen(false)
                  }}
                />
              </div>
            </Sheet>,
            document.body
          )}
      </>
    )
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 text-sm font-semibold">Color de la etiqueta</legend>
      <div className="flex flex-wrap gap-1">
        {STUDENT_LABEL_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            aria-label={color.name}
            aria-pressed={value === color.id}
            title={color.name}
            onClick={() => onChange(color.id)}
            className="grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--c-ocean) disabled:opacity-50"
          >
            <span
              className={`grid size-7 place-items-center rounded-full border ${value === color.id ? 'ring-2 ring-offset-2' : ''}`}
              style={{
                backgroundColor: color.color,
                backgroundImage:
                  color.id === 'transparent'
                    ? 'repeating-conic-gradient(#e2e8f0 0% 25%, white 0% 50%)'
                    : undefined,
                backgroundSize: color.id === 'transparent' ? '8px 8px' : undefined,
                color: color.text,
                borderColor: color.text,
                outlineColor: color.text,
              }}
            >
              {value === color.id && <FiCheck aria-hidden="true" size={16} />}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
