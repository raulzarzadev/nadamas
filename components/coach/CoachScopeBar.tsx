'use client'

import { useState } from 'react'
import { FiCheck, FiChevronRight, FiSearch, FiX } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'

export type ScopeOption = { id: string; label: string }

// Coach workspace filter styled like the athlete search bar: shows the current space
// (e.g. personal classes, a school or everything), opens a sheet to switch, and its X
// returns to the default option.
export default function CoachScopeBar({
  options,
  value,
  defaultValue,
  onChange,
}: {
  options: ScopeOption[]
  value: string
  defaultValue: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.id === value) || options[0]
  const clearable = selected && selected.id !== defaultValue
  const pick = (id: string) => {
    setOpen(false)
    onChange(id)
  }
  return (
    <>
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${selected?.label}. Cambiar espacio de trabajo`}
          onClick={() => setOpen(true)}
          className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-full border border-(--c-border) bg-white px-4 text-left text-sm shadow-[0_1px_0_rgba(13,44,72,0.05)] transition-colors hover:border-(--c-aqua-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${clearable ? 'pr-14' : ''}`}
        >
          <FiSearch aria-hidden="true" className="size-5 shrink-0 text-(--c-ocean)" />
          <span className="truncate font-semibold text-(--c-ocean)">{selected?.label}</span>
        </button>
        {clearable && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            aria-label={`Quitar ${selected.label}`}
            title={`Quitar ${selected.label}`}
            className="absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-(--c-text-2) transition-colors hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
          >
            <FiX aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} label="Espacio de trabajo">
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <h2 className="text-xl font-bold text-(--c-ocean)">Espacio de trabajo</h2>
          <p className="text-sm text-(--c-text-2)">
            Tus clases particulares o las escuelas donde eres entrenador.
          </p>
          <ul className="grid min-w-0 grid-cols-1 gap-2">
            {options.map((option) => {
              const active = option.id === selected?.id
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => pick(option.id)}
                    className={`flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${active ? 'border-(--c-ocean) bg-(--c-surface) text-(--c-ocean)' : 'border-(--c-border) bg-white text-(--c-ocean) hover:border-(--c-aqua-strong) hover:bg-(--c-surface)'}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {active ? (
                      <FiCheck aria-hidden="true" className="shrink-0" />
                    ) : (
                      <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </Sheet>
    </>
  )
}
