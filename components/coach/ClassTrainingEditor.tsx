'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import TrainingSeriesForm from '@/components/coach/TrainingSeriesForm'
import DurationInput from '@/components/ui/duration-input'
import Sheet from '@/components/ui/sheet'
import SortableList from '@/components/ui/sortable-list'
import TrainingBrace from '@/components/ui/training-brace'
import type { ClassTrainingBlock, ClassTrainingSeries } from '@/lib/class-training'

export default function ClassTrainingEditor({
  blocks,
  onChange,
  disabled = false,
  readOnly = false,
  onEditingChange,
  onCreateFirstBlock,
  initialBlockId,
}: {
  blocks: ClassTrainingBlock[]
  onChange: (blocks: ClassTrainingBlock[]) => void
  disabled?: boolean
  readOnly?: boolean
  onEditingChange?: (editing: boolean) => void
  onCreateFirstBlock?: () => void
  initialBlockId?: string
}) {
  const update = (key: string, change: Partial<ClassTrainingBlock>) =>
    onChange(blocks.map((block) => (block.id === key ? { ...block, ...change } : block)))
  const [editing, setEditing] = useState<{ blockId: string; series?: ClassTrainingSeries } | null>(
    null
  )
  const [pauseForm, setPauseForm] = useState<{
    blockId: string
    seriesId?: string
    time: string
  } | null>(null)
  // Block settings sheet: title, repetitions and delete.
  const [blockForm, setBlockForm] = useState<{
    id: string
    title: string
    observations: string
    repetitions: number
  } | null>(() => {
    const block = blocks.find((item) => item.id === initialBlockId)
    return block
      ? {
          id: block.id,
          title: block.title ?? '',
          observations: block.observations ?? '',
          repetitions: block.repetitions,
        }
      : null
  })
  useEffect(() => {
    onEditingChange?.(Boolean(editing) || Boolean(blockForm) || Boolean(pauseForm))
    return () => onEditingChange?.(false)
  }, [editing, blockForm, pauseForm, onEditingChange])
  if (readOnly)
    return (
      <section aria-label="Entrenamiento" className="grid min-w-0 gap-2">
        {!blocks.length && (
          <div className="grid justify-items-center gap-3 py-2">
            <p className="text-sm text-(--c-text-2)">No hay bloques.</p>
            {onCreateFirstBlock && (
              <button
                type="button"
                disabled={disabled}
                onClick={onCreateFirstBlock}
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-black px-4 text-xs font-semibold text-white hover:bg-black/80 focus-visible:outline-2 disabled:opacity-40"
              >
                <FiPlus aria-hidden="true" />
                Crear bloque
              </button>
            )}
          </div>
        )}
        {blocks.map((block, index) => (
          <fieldset
            key={block.id}
            className="min-w-0 rounded-2xl border border-(--c-border) bg-(--c-surface) p-2"
          >
            <legend className="px-1 text-sm font-bold">
              <span className="mr-1 font-normal text-(--c-text-2)">{index + 1} ·</span>
              {block.title || 'Bloque'}
            </legend>
            {block.observations?.trim() && (
              <p className="mb-2 whitespace-pre-wrap wrap-anywhere text-xs leading-relaxed text-(--c-text-2)">
                {block.observations}
              </p>
            )}
            <div className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)] gap-x-1.5 gap-y-1">
              <div className="flex items-center gap-1 self-stretch text-sm font-bold">
                <div className="relative flex w-10 shrink-0 items-center justify-center">
                  <span>{block.repetitions}×</span>
                </div>
                <TrainingBrace />
              </div>
              <ul className="grid min-w-0 content-center gap-1">
                {block.series.map((series) => (
                  <li
                    key={series.id}
                    className="min-w-0 wrap-anywhere py-0.5 text-xs leading-tight"
                  >
                    <strong className="mr-1 inline-block" hidden={series.kind === 'pause'}>
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
                        · {series.kind === 'pause' ? '' : 'Cada '}
                        {series.interval}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </fieldset>
        ))}
      </section>
    )
  return (
    <section aria-label="Entrenamiento" className="grid gap-2">
      {blocks.length === 0 && (
        <p className="text-center text-sm text-(--c-text-2)">No hay bloques.</p>
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
                      observations: block.observations || '',
                      repetitions: block.repetitions,
                    })
                  }
                  className="grid size-6 place-items-center rounded-full text-(--c-text-2) hover:bg-white focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                >
                  <FiEdit2 aria-hidden="true" className="size-3.5" />
                </button>
              </span>
            </legend>

            {block.observations?.trim() && (
              <p className="mb-2 whitespace-pre-wrap wrap-anywhere text-xs leading-relaxed text-(--c-text-2)">
                {block.observations}
              </p>
            )}
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
                        onClick={() =>
                          series.kind === 'pause'
                            ? setPauseForm({
                                blockId: block.id,
                                seriesId: series.id,
                                time: series.interval,
                              })
                            : setEditing({ blockId: block.id, series })
                        }
                        className="min-h-6 min-w-0 flex-1 rounded-lg py-0.5 text-left text-xs leading-tight focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                      >
                        <strong className="mr-1 inline-block" hidden={series.kind === 'pause'}>
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
                            · {series.kind === 'pause' ? '' : 'Cada '}
                            {series.interval}
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
                <div className="flex flex-wrap justify-start gap-2">
                  <button
                    type="button"
                    disabled={block.series.length >= 30}
                    onClick={() => setEditing({ blockId: block.id })}
                    className="btn btn-subtle w-fit"
                  >
                    <FiPlus aria-hidden="true" />
                    Agregar serie
                  </button>
                  <button
                    type="button"
                    disabled={disabled || block.series.length >= 30}
                    onClick={() => setPauseForm({ blockId: block.id, time: '' })}
                    className="btn btn-subtle w-fit"
                  >
                    <FiPlus aria-hidden="true" />
                    Agregar pausa
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
        className={
          blocks.length === 0
            ? 'inline-flex min-h-9 w-fit items-center justify-center gap-2 justify-self-center rounded-full bg-black px-4 text-xs font-semibold text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40'
            : 'btn btn-subtle w-fit justify-self-end'
        }
      >
        <FiPlus aria-hidden="true" />
        {blocks.length === 0 ? 'Agregar primer bloque' : 'Agregar bloque'}
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
      {pauseForm &&
        createPortal(
          <Sheet
            open
            keyboardAware
            label={pauseForm.seriesId ? 'Editar pausa' : 'Agregar pausa'}
            onClose={() => setPauseForm(null)}
            footer={
              <button
                type="button"
                className="btn btn-primary min-h-11 w-full"
                disabled={
                  disabled ||
                  !/^\d{0,3}:[0-5]?\d?$/.test(pauseForm.time) ||
                  !pauseForm.time.replace(/[:0]/g, '')
                }
                onClick={() => {
                  if (
                    !/^\d{0,3}:[0-5]?\d?$/.test(pauseForm.time) ||
                    !pauseForm.time.replace(/[:0]/g, '')
                  )
                    return
                  const block = blocks.find((item) => item.id === pauseForm.blockId)
                  if (!block) return
                  const pause: ClassTrainingSeries = {
                    id: pauseForm.seriesId || crypto.randomUUID(),
                    kind: 'pause',
                    repetitions: 1,
                    distanceMeters: null,
                    exercise: 'Pausa',
                    interval: `${Number(pauseForm.time.split(':')[0] || 0)}:${String(Number(pauseForm.time.split(':')[1] || 0)).padStart(2, '0')}`,
                  }
                  update(block.id, {
                    series: pauseForm.seriesId
                      ? block.series.map((item) => (item.id === pause.id ? pause : item))
                      : [...block.series, pause],
                  })
                  setPauseForm(null)
                }}
              >
                Guardar
              </button>
            }
          >
            <div className="grid min-w-0 gap-3 pb-4">
              <h2 className="text-lg font-bold">Tiempo de pausa</h2>
              <DurationInput
                minutes={pauseForm.time.split(':')[0] || ''}
                seconds={pauseForm.time.split(':')[1] || ''}
                disabled={disabled}
                onChange={(minutes, seconds) =>
                  setPauseForm({ ...pauseForm, time: `${minutes}:${seconds}` })
                }
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
                    setBlockForm(null)
                    onChange(
                      blocks.map((item) =>
                        item.id === blockForm.id
                          ? {
                              id: item.id,
                              ...(title ? { title } : {}),
                              observations: blockForm.observations.trim(),
                              repetitions: blockForm.repetitions,
                              series: item.series,
                            }
                          : item
                      )
                    )
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
                  className="box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 text-base outline-none focus:border-(--c-ocean) focus:ring-2 focus:ring-(--c-ocean) focus:ring-inset"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                Observaciones (opcional)
                <textarea
                  rows={1}
                  maxLength={2000}
                  placeholder="Observaciones del bloque"
                  value={blockForm.observations}
                  onChange={(event) =>
                    setBlockForm({ ...blockForm, observations: event.target.value })
                  }
                  className="[field-sizing:content] box-border min-h-11 w-full min-w-0 max-w-full resize-none rounded-xl border border-(--c-border) bg-white p-3 text-base font-normal outline-none focus:border-(--c-ocean) focus:ring-2 focus:ring-(--c-ocean) focus:ring-inset"
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
                  className="box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 text-base outline-none focus:border-(--c-ocean) focus:ring-2 focus:ring-(--c-ocean) focus:ring-inset"
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
