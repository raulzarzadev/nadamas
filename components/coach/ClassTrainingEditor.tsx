'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import TrainingSeriesForm from '@/components/coach/TrainingSeriesForm'
import Sheet from '@/components/ui/sheet'
import SortableList from '@/components/ui/sortable-list'
import TrainingBrace from '@/components/ui/training-brace'
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
  const [editingRepeat, setEditingRepeat] = useState<{ id: string; value: string } | null>(null)
  const [addingBlock, setAddingBlock] = useState(false)
  const [repetitions, setRepetitions] = useState(1)
  useEffect(() => {
    onEditingChange?.(Boolean(editing) || addingBlock)
    return () => onEditingChange?.(false)
  }, [editing, addingBlock, onEditingChange])
  return (
    <section aria-label="Entrenamiento" className="grid gap-2">
      {blocks.length === 0 && (
        <p className="text-sm text-(--c-text-2)">
          Agrega un bloque con sus series y el número de veces que se repite.
        </p>
      )}
      <SortableList
        items={blocks}
        onChange={onChange}
        disabled={disabled}
        label="bloque"
        className="grid gap-2"
      >
        {(block, index, blockHandle) => (
          <fieldset
            key={block.id}
            disabled={disabled}
            className="min-w-0 rounded-2xl border border-(--c-border) bg-(--c-surface) p-2"
          >
            <legend className="px-1 text-sm font-bold">
              <span className="inline-flex items-center gap-1">
                {blockHandle}
                Bloque {index + 1}
                <button
                  type="button"
                  aria-label={`Eliminar bloque ${index + 1}`}
                  onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}
                  className="grid size-6 place-items-center rounded-full text-(--c-text-2) hover:bg-white focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </span>
            </legend>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1.5 gap-y-1">
              <div className="flex items-center gap-1 self-stretch text-sm font-bold">
                <div className="relative flex w-10 shrink-0 items-center justify-center">
                  {editingRepeat?.id === block.id ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      aria-label={`Repeticiones del bloque ${index + 1}`}
                      value={editingRepeat.value}
                      ref={(element) => element?.focus()}
                      onChange={(event) =>
                        setEditingRepeat({ id: block.id, value: event.target.value })
                      }
                      onBlur={() => {
                        const value = Number(editingRepeat.value)
                        if (Number.isInteger(value) && value >= 1 && value <= 99)
                          update(block.id, { repetitions: value })
                        setEditingRepeat(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          event.currentTarget.blur()
                        }
                        if (event.key === 'Escape') {
                          event.stopPropagation()
                          setEditingRepeat(null)
                        }
                      }}
                      className="h-7 w-10 rounded border border-(--c-border) bg-white text-center text-xs focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                    />
                  ) : (
                    <>
                      <span>{block.repetitions}×</span>
                      <button
                        type="button"
                        aria-label={`Editar repeticiones del bloque ${index + 1}`}
                        onClick={() =>
                          setEditingRepeat({ id: block.id, value: String(block.repetitions) })
                        }
                        className="absolute top-full left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded text-(--c-text-2) hover:bg-white focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                      >
                        <FiEdit2 aria-hidden="true" className="size-3" />
                      </button>
                    </>
                  )}
                </div>
                <TrainingBrace />
              </div>
              <div className="min-w-0">
                <SortableList
                  items={block.series}
                  onChange={(series) => update(block.id, { series })}
                  disabled={disabled}
                  label="serie"
                >
                  {(series, seriesIndex, seriesHandle) => (
                    <div
                      key={series.id}
                      className="flex items-center gap-1 rounded-lg transition-colors hover:bg-white/80 focus-within:bg-white/80"
                    >
                      {seriesHandle}
                      <button
                        type="button"
                        aria-label={`Editar serie ${seriesIndex + 1}`}
                        onClick={() => setEditing({ blockId: block.id, series })}
                        className="min-h-6 min-w-0 flex-1 rounded-lg py-0.5 text-left text-xs leading-tight focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                      >
                        <strong className="mr-1 inline-block">
                          {series.repetitions} ×{' '}
                          {series.distanceMeters !== null
                            ? `${series.distanceMeters} m`
                            : 'sin distancia'}
                        </strong>
                        <span>{series.exercise}</span>
                        {series.material && (
                          <span className="ml-1 text-[11px] text-(--c-text-2)">
                            · {series.material}
                          </span>
                        )}
                        {series.interval && (
                          <span className="ml-1 text-[11px] text-(--c-text-2)">
                            · Cada {series.interval}
                          </span>
                        )}
                      </button>
                      <div className="shrink-0">
                        <button
                          type="button"
                          aria-label={`Eliminar serie ${seriesIndex + 1}`}
                          onClick={() =>
                            update(block.id, {
                              series: block.series.filter((item) => item.id !== series.id),
                            })
                          }
                          className="grid size-6 place-items-center rounded-full text-(--c-text-2) hover:bg-white focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </SortableList>
                <div className="flex justify-start">
                  <button
                    type="button"
                    disabled={block.series.length >= 30}
                    onClick={() => setEditing({ blockId: block.id })}
                    className="btn btn-subtle w-fit"
                  >
                    <FiPlus aria-hidden="true" />
                    Agregar serie
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        )}
      </SortableList>
      <button
        type="button"
        disabled={disabled || blocks.length >= 20}
        onClick={() => {
          setRepetitions(1)
          setAddingBlock(true)
        }}
        className="btn btn-subtle w-fit justify-self-end"
      >
        <FiPlus aria-hidden="true" />
        Agregar bloque
      </button>
      {editing &&
        createPortal(
          <Sheet
            open
            keyboardAware
            fullBleedMobile
            label={editing.series ? 'Editar serie' : 'Agregar serie'}
            onClose={() => setEditing(null)}
          >
            <div className="px-4 pb-4 sm:px-0">
              <TrainingSeriesForm
                key={editing.series?.id || 'new'}
                initial={editing.series}
                seriesNumber={
                  editing.series
                    ? (blocks
                        .find((block) => block.id === editing.blockId)
                        ?.series.findIndex((series) => series.id === editing.series?.id) ?? 0) + 1
                    : (blocks.find((block) => block.id === editing.blockId)?.series.length ?? 0) + 1
                }
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
            fullBleedMobile
            label="Agregar bloque"
            onClose={() => setAddingBlock(false)}
            footer={
              <div className="flex justify-end gap-2 px-4 sm:px-0">
                <button
                  type="button"
                  className="btn border btn-outline min-h-11"
                  onClick={() => setAddingBlock(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn border btn-primary min-h-11"
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
              <fieldset
                aria-label="Sugerencias de repeticiones del bloque"
                className="grid grid-cols-5 gap-2"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={repetitions === value}
                    onClick={() => setRepetitions(value)}
                    className={`btn border min-h-11 px-2 ${repetitions === value ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {value}
                  </button>
                ))}
              </fieldset>
            </div>
          </Sheet>,
          document.body
        )}
    </section>
  )
}
