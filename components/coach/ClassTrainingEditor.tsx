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
  // Block settings sheet: title, repetitions and delete.
  const [blockForm, setBlockForm] = useState<{
    id: string
    title: string
    repetitions: number
  } | null>(null)
  useEffect(() => {
    onEditingChange?.(Boolean(editing) || Boolean(blockForm))
    return () => onEditingChange?.(false)
  }, [editing, blockForm, onEditingChange])
  return (
    <section aria-label="Entrenamiento" className="grid gap-2">
      {blocks.length === 0 && (
        <p className="text-sm text-(--c-text-2)">Agrega un bloque y después sus series.</p>
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
                <span className="font-normal text-(--c-text-2)">{index + 1} ·</span>
                {block.title || 'Bloque'}
                <button
                  type="button"
                  aria-label={`Editar ${block.title || `bloque ${index + 1}`}`}
                  title="Editar bloque"
                  onClick={() =>
                    setBlockForm({
                      id: block.id,
                      title: block.title || '',
                      repetitions: block.repetitions,
                    })
                  }
                  className="grid size-6 place-items-center rounded-full text-(--c-text-2) hover:bg-white focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                >
                  <FiEdit2 aria-hidden="true" className="size-3.5" />
                </button>
              </span>
            </legend>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1.5 gap-y-1">
              <div className="flex items-center gap-1 self-stretch text-sm font-bold">
                <div className="relative flex w-10 shrink-0 items-center justify-center">
                  <span>{block.repetitions}×</span>
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
                          {series.repetitions}×
                          {series.distanceMeters !== null ? ` ${series.distanceMeters} m` : ''}
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
        // Adds an empty 1× block right away; repetitions and series are edited in place.
        onClick={() =>
          onChange([...blocks, { id: crypto.randomUUID(), repetitions: 1, series: [] }])
        }
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
      {blockForm &&
        createPortal(
          <Sheet
            open
            keyboardAware
            fullBleedMobile
            label="Editar bloque"
            onClose={() => setBlockForm(null)}
            footer={
              <div className="flex items-center gap-2 px-4 sm:px-0">
                <button
                  type="button"
                  className="btn btn-ghost min-h-11 gap-1.5 text-rose-700"
                  onClick={() => {
                    onChange(blocks.filter((item) => item.id !== blockForm.id))
                    setBlockForm(null)
                  }}
                >
                  <FiTrash2 aria-hidden="true" /> Eliminar bloque
                </button>
                <button
                  type="button"
                  className="btn border btn-primary ml-auto min-h-11"
                  disabled={
                    !Number.isInteger(blockForm.repetitions) ||
                    blockForm.repetitions < 1 ||
                    blockForm.repetitions > 99
                  }
                  onClick={() => {
                    const title = blockForm.title.trim()
                    onChange(
                      blocks.map((item) =>
                        item.id === blockForm.id
                          ? {
                              id: item.id,
                              ...(title ? { title } : {}),
                              repetitions: blockForm.repetitions,
                              series: item.series,
                            }
                          : item
                      )
                    )
                    setBlockForm(null)
                  }}
                >
                  Guardar
                </button>
              </div>
            }
          >
            <div className="grid gap-4 px-4 pb-4 sm:px-0">
              <h2 className="text-xl font-bold">Editar bloque</h2>
              <label className="grid gap-2 text-sm font-semibold">
                Título
                <input
                  type="text"
                  maxLength={60}
                  placeholder={`Bloque ${blocks.findIndex((item) => item.id === blockForm.id) + 1}`}
                  value={blockForm.title}
                  onChange={(event) => setBlockForm({ ...blockForm, title: event.target.value })}
                  className="min-h-12 w-full rounded-xl border border-(--c-border) bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                ¿Cuántas veces se repite?
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  value={blockForm.repetitions || ''}
                  onChange={(event) =>
                    setBlockForm({ ...blockForm, repetitions: Number(event.target.value) })
                  }
                  className="min-h-12 w-full rounded-xl border border-(--c-border) bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                />
              </label>
              <fieldset aria-label="Sumar repeticiones" className="grid grid-cols-4 gap-2">
                {[1, 2, 4, 8].map((step) => (
                  <button
                    key={step}
                    type="button"
                    aria-label={`Sumar ${step}`}
                    onClick={() =>
                      setBlockForm({
                        ...blockForm,
                        repetitions: Math.min(99, (blockForm.repetitions || 0) + step),
                      })
                    }
                    className="btn btn-outline border min-h-11 px-2"
                  >
                    +{step}
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
