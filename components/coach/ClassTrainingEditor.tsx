'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import TrainingSeriesForm from '@/components/coach/TrainingSeriesForm'
import Sheet from '@/components/ui/sheet'
import type { ClassTrainingBlock, ClassTrainingSeries } from '@/lib/class-training'

export default function ClassTrainingEditor({
  blocks,
  onChange,
  disabled = false,
  onEditingChange,
}: {
  blocks: ClassTrainingBlock[]
  onChange: (blocks: ClassTrainingBlock[]) => void
  disabled?: boolean
  onEditingChange?: (editing: boolean) => void
}) {
  const update = (key: string, change: Partial<ClassTrainingBlock>) =>
    onChange(blocks.map((block) => (block.id === key ? { ...block, ...change } : block)))
  const [editing, setEditing] = useState<{ blockId: string; series?: ClassTrainingSeries } | null>(
    null
  )
  const [addingBlock, setAddingBlock] = useState(false)
  const [repetitions, setRepetitions] = useState(1)
  useEffect(() => {
    onEditingChange?.(Boolean(editing) || addingBlock)
    return () => onEditingChange?.(false)
  }, [editing, addingBlock, onEditingChange])
  return (
    <section aria-label="Entrenamiento" className="grid gap-3">
      {blocks.length === 0 && (
        <p className="text-sm text-(--c-text-2)">
          Agrega un bloque con sus series y el número de veces que se repite.
        </p>
      )}
      {blocks.map((block, index) => (
        <fieldset
          key={block.id}
          disabled={disabled}
          className="min-w-0 rounded-2xl border border-(--c-border) bg-(--c-surface) p-3"
        >
          <legend className="px-1 text-sm font-bold">Bloque {index + 1}</legend>
          <div className="mb-3 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              Repetir
              <span className="text-lg" aria-hidden="true">
                ×
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={block.repetitions || ''}
                onChange={(event) => update(block.id, { repetitions: Number(event.target.value) })}
                className="min-h-11 w-16 rounded-xl border border-(--c-border) bg-white px-2 text-center font-bold focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
              />
            </label>
            <button
              type="button"
              aria-label={`Eliminar bloque ${index + 1}`}
              onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}
              className="grid size-11 place-items-center rounded-full text-(--c-text-2) hover:bg-white focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
            >
              <FiTrash2 aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 border-l-2 border-(--c-ocean) pl-3">
            {block.series.map((series, seriesIndex) => (
              <div
                key={series.id}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-(--c-border) bg-white p-2"
              >
                <span className="min-w-0 flex-1 text-sm">
                  <strong>
                    {series.repetitions} ×{' '}
                    {series.distanceMeters !== null
                      ? `${series.distanceMeters} m`
                      : 'sin distancia'}
                  </strong>{' '}
                  {series.exercise}
                  {series.material ? ` con ${series.material}` : ''}
                  {series.interval ? ` a ${series.interval}` : ''}
                </span>
                <button
                  type="button"
                  aria-label={`Editar serie ${seriesIndex + 1}`}
                  onClick={() => setEditing({ blockId: block.id, series })}
                  className="grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                >
                  <FiEdit2 aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar serie ${seriesIndex + 1}`}
                  onClick={() =>
                    update(block.id, {
                      series: block.series.filter((item) => item.id !== series.id),
                    })
                  }
                  className="grid size-11 shrink-0 place-items-center rounded-full text-(--c-text-2) focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={block.series.length >= 30}
              onClick={() => setEditing({ blockId: block.id })}
              className="btn btn-outline min-h-11 w-fit gap-2"
            >
              <FiPlus aria-hidden="true" />
              Agregar serie
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={disabled || blocks.length >= 20}
        onClick={() => {
          setRepetitions(1)
          setAddingBlock(true)
        }}
        className="btn btn-outline min-h-11 w-fit gap-2"
      >
        <FiPlus aria-hidden="true" />
        Agregar bloque
      </button>
      {editing &&
        createPortal(
          <Sheet
            open
            keyboardAware
            label={editing.series ? 'Editar serie' : 'Agregar serie'}
            onClose={() => setEditing(null)}
          >
            <div className="px-4 pb-4 sm:px-0">
              <TrainingSeriesForm
                key={editing.series?.id || 'new'}
                initial={editing.series}
                onCancel={() => setEditing(null)}
                onSave={(series) => {
                  const block = blocks.find((item) => item.id === editing.blockId)
                  if (block)
                    update(block.id, {
                      series: editing.series
                        ? block.series.map((item) => (item.id === series.id ? series : item))
                        : [...block.series, series],
                    })
                  setEditing(null)
                }}
              />
            </div>
          </Sheet>,
          document.body
        )}
      {addingBlock &&
        createPortal(
          <Sheet
            open
            keyboardAware
            label="Agregar bloque"
            onClose={() => setAddingBlock(false)}
            footer={
              <div className="flex justify-end gap-2 px-4 sm:px-0">
                <button
                  type="button"
                  className="btn btn-outline min-h-11"
                  onClick={() => setAddingBlock(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary min-h-11"
                  disabled={!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 99}
                  onClick={() => {
                    const blockId = crypto.randomUUID()
                    onChange([...blocks, { id: blockId, repetitions, series: [] }])
                    setAddingBlock(false)
                    setEditing({ blockId })
                  }}
                >
                  Agregar bloque
                </button>
              </div>
            }
          >
            <div className="grid gap-4 px-4 pb-4 sm:px-0">
              <h2 className="text-xl font-bold">Agregar bloque</h2>
              <label className="grid gap-2 text-sm font-semibold">
                ¿Cuántas veces se repite el bloque?
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  value={repetitions || ''}
                  onChange={(event) => setRepetitions(Number(event.target.value))}
                  className="min-h-12 w-full rounded-xl border border-(--c-border) bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                />
              </label>
            </div>
          </Sheet>,
          document.body
        )}
    </section>
  )
}
