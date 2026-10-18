'use client'

import { useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'

export default function CycleDetails({
  value,
  onChange,
  disabled,
}: {
  value: { goal: string; content: string }
  onChange: (value: { goal: string; content: string }) => void
  disabled: boolean
}) {
  const objectives = [
    ...new Set(
      value.goal
        .split('\n')
        .map((goal) => goal.trim())
        .filter(Boolean)
    ),
  ]
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [text, setText] = useState('')
  const save = () => {
    if (!text.trim() || disabled) return
    const next =
      editing === 'new'
        ? [...objectives, text.trim()]
        : objectives.map((goal, index) => (index === editing ? text.trim() : goal))
    onChange({ ...value, goal: next.join('\n') })
    setEditing(null)
  }
  return (
    <div className="my-3 grid min-w-0 gap-2 rounded-xl bg-(--c-surface) p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold">Objetivos</h3>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setText('')
            setEditing('new')
          }}
          className="min-h-8 rounded-full px-2 text-[10px] font-semibold text-(--c-aqua-strong) hover:bg-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
        >
          + Agregar objetivo
        </button>
      </div>
      {objectives.length ? (
        <ul className="grid gap-2">
          {objectives.map((goal, index) => (
            <li
              key={goal}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-1"
            >
              <span className="min-w-0 flex-1 break-words text-xs">{goal}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Editar objetivo ${index + 1}`}
                onClick={() => {
                  setText(goal)
                  setEditing(index)
                }}
                className="grid size-8 shrink-0 place-items-center rounded-full text-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
              >
                <FiEdit2 aria-hidden="true" className="size-3" />
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Eliminar objetivo ${index + 1}`}
                onClick={() =>
                  onChange({
                    ...value,
                    goal: objectives.filter((_, position) => position !== index).join('\n'),
                  })
                }
                className="grid size-8 shrink-0 place-items-center rounded-full text-xs text-(--c-text-2) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-(--c-text-2)">Aún no hay objetivos.</p>
      )}
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        label={editing === 'new' ? 'Agregar objetivo' : 'Editar objetivo'}
        size="sm"
        keyboardAware
        footer={
          <button
            type="button"
            disabled={disabled || !text.trim()}
            onClick={save}
            className="min-h-11 w-full rounded-full bg-(--c-ocean) px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
          >
            Listo
          </button>
        }
      >
        <label className="grid min-w-0 gap-2 pb-4 text-sm font-semibold">
          Objetivo
          <input
            required
            maxLength={500}
            disabled={disabled}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-11 min-w-0 rounded-xl border border-(--c-border) bg-white px-3 font-normal focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
          />
        </label>
      </Sheet>
    </div>
  )
}
