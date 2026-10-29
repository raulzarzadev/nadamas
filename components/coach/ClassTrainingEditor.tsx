'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiPlus, FiRepeat, FiTrash2 } from 'react-icons/fi'
import TrainingSeriesForm from '@/components/coach/TrainingSeriesForm'
import WorkoutTransferSheet from '@/components/coach/WorkoutTransferSheet'
import DurationInput from '@/components/ui/duration-input'
import Sheet from '@/components/ui/sheet'
import SortableList from '@/components/ui/sortable-list'
import TrainingBrace from '@/components/ui/training-brace'
import {
  blockDistance,
  blockDuration,
  type ClassTrainingBlock,
  type ClassTrainingSeries,
  formatSeriesDuration,
  formatTrainingDistance,
  formatTrainingDuration,
  formatTrainingSummaryDuration,
  seriesDurationSeconds,
} from '@/lib/class-training'

function BlockTotal({ block }: { block: ClassTrainingBlock }) {
  const duration = blockDuration(block)
  return (
    <span className="text-xs font-normal italic text-(--c-text-2)">
      {formatTrainingDistance(blockDistance(block))}
      {duration.seconds > 0 && (
        <>
          {' '}
          · {!duration.complete && '~'}
          {formatTrainingSummaryDuration(duration.seconds)}
        </>
      )}
    </span>
  )
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-3">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function PauseDivider({ series }: { series: ClassTrainingSeries }) {
  return (
    <span className="flex w-full items-center gap-2">
      <span className="h-px flex-1 bg-(--c-border)" />
      <span className="inline-flex items-center gap-1 rounded-full bg-(--c-surface) px-2 py-1 text-xs font-bold text-(--c-ocean)">
        <PauseIcon /> Pausa {series.interval}
      </span>
      <span className="h-px flex-1 bg-(--c-border)" />
    </span>
  )
}

function SeriesContent({
  series,
  readOnly = false,
}: {
  series: ClassTrainingSeries
  readOnly?: boolean
}) {
  const details = [
    series.zone,
    series.material,
    series.interval && !/^0+:0+$/.test(series.interval.trim())
      ? `${(series.intervalType ?? (series.durationSeconds ? 'rest' : 'interval')) === 'rest' ? 'Descanso' : 'cada'} ${series.interval}`
      : '',
  ].filter(Boolean)
  const seconds = seriesDurationSeconds(series)
  return (
    <span className="flex min-w-0 w-full items-baseline gap-2">
      <span className="min-w-0 flex-1 wrap-anywhere">
        <span className="block text-sm font-bold">
          {series.repetitions}×{series.distanceMeters !== null ? ` ${series.distanceMeters} m` : ''}
          {series.durationSeconds ? ` ${formatTrainingDuration(series.durationSeconds)} min` : ''}
          {series.exercise ? ` ${series.exercise}` : ''}
        </span>
        {details.length > 0 && (
          <span className="block text-xs text-(--c-text-2)">{details.join(' · ')}</span>
        )}
      </span>
      {readOnly && seconds !== null && (
        <span className="text-xs font-bold tabular-nums text-(--c-text-2)">
          {formatSeriesDuration(seconds)}
        </span>
      )}
    </span>
  )
}

export default function ClassTrainingEditor({
  blocks,
  onChange,
  disabled = false,
  readOnly = false,
  onEditingChange,
  onCreateFirstBlock,
}: {
  blocks: ClassTrainingBlock[]
  onChange: (blocks: ClassTrainingBlock[]) => void
  disabled?: boolean
  readOnly?: boolean
  onEditingChange?: (editing: boolean) => void
  onCreateFirstBlock?: () => void
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
  const [transferBlockId, setTransferBlockId] = useState<string | null>(null)
  // Block settings sheet: title, repetitions and delete.
  useEffect(() => {
    onEditingChange?.(Boolean(editing) || Boolean(pauseForm) || Boolean(transferBlockId))
    return () => onEditingChange?.(false)
  }, [editing, pauseForm, transferBlockId, onEditingChange])
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
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-(--c-ocean) px-4 text-xs font-semibold text-white disabled:opacity-40"
              >
                <FiPlus aria-hidden="true" />
                Crear bloque
              </button>
            )}
          </div>
        )}
        {blocks.map((block, index) => (
          <section
            key={block.id}
            aria-label={block.title || `Bloque ${index + 1}`}
            className="min-w-0 rounded-2xl border border-(--c-border) bg-(--c-surface) p-3"
          >
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h3 className="text-base font-bold">
                {index + 1}. {block.title || 'Bloque'}
              </h3>
              <BlockTotal block={block} />
            </div>
            {block.observations?.trim() && (
              <p className="mt-1 whitespace-pre-wrap wrap-anywhere text-xs text-(--c-text-2)">
                {block.observations}
              </p>
            )}
            <div className="mt-2 flex min-w-0 items-stretch gap-2">
              <div className="flex items-center gap-1 font-bold text-(--c-ocean)">
                <span>{block.repetitions}×</span>
                <TrainingBrace />
              </div>
              <ul className="grid min-w-0 flex-1 content-center gap-2 py-1">
                {block.series.map((series) => (
                  <li key={series.id}>
                    {series.kind === 'pause' ? (
                      <PauseDivider series={series} />
                    ) : (
                      <SeriesContent series={series} readOnly />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
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
        handleClassName="size-11"
      >
        {(block, index, blockHandle) => (
          <fieldset
            key={block.id}
            disabled={disabled}
            className="min-w-0 rounded-2xl border border-(--c-border) bg-(--c-surface) p-3"
          >
            {/* Block drag handle sits on the right so it never lines up with the series handles. */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                aria-label={`Nombre del bloque ${index + 1}`}
                maxLength={60}
                value={block.title ?? ''}
                placeholder={`Bloque ${index + 1}`}
                onChange={(event) => update(block.id, { title: event.target.value })}
                className="box-border h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-base font-extrabold text-(--c-ocean) outline-none hover:border-(--c-border) focus:border-(--c-aqua-strong) focus:bg-white focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
              />
              {blockHandle}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-1 pl-1">
              <span className="min-w-0 flex-1">
                <BlockTotal block={block} />
              </span>
              <div className="flex shrink-0 items-center rounded-full border border-(--c-border) bg-white">
                <button
                  type="button"
                  aria-label="Menos repeticiones"
                  disabled={block.repetitions <= 1}
                  onClick={() => update(block.id, { repetitions: block.repetitions - 1 })}
                  className="size-11 text-lg disabled:opacity-40"
                >
                  −
                </button>
                <span className="min-w-6 text-center text-sm font-bold">{block.repetitions}×</span>
                <button
                  type="button"
                  aria-label="Más repeticiones"
                  disabled={block.repetitions >= 99}
                  onClick={() => update(block.id, { repetitions: block.repetitions + 1 })}
                  className="size-11 text-lg disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                aria-label={`Transferir bloque ${index + 1}`}
                title="Transferir"
                onClick={() => setTransferBlockId(block.id)}
                className="grid size-11 shrink-0 place-items-center rounded-full text-(--c-ocean) hover:bg-white"
              >
                <FiRepeat aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Eliminar bloque ${index + 1}`}
                title="Eliminar bloque"
                onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}
                className="grid size-11 shrink-0 place-items-center rounded-full text-(--rose-tx) hover:bg-white"
              >
                <FiTrash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
            <textarea
              aria-label={`Descripción del bloque ${index + 1}`}
              maxLength={2000}
              rows={1}
              value={block.observations ?? ''}
              placeholder="Descripción del bloque"
              onChange={(event) => update(block.id, { observations: event.target.value })}
              className="mb-2 box-border min-h-9 w-full min-w-0 resize-none rounded-lg border border-(--c-border) bg-white px-2 py-1.5 text-xs leading-relaxed text-(--c-ocean) outline-none [field-sizing:content] placeholder:text-(--c-text-2) focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
            />
            <SortableList
              items={block.series}
              onChange={(series) => update(block.id, { series })}
              disabled={disabled}
              label="serie"
              className="grid gap-1"
              handleClassName="size-11"
            >
              {(series, seriesIndex, seriesHandle) => (
                <div
                  className={
                    series.kind === 'pause'
                      ? 'flex items-center'
                      : 'flex items-center rounded-xl border border-(--c-border)'
                  }
                >
                  {seriesHandle}
                  <button
                    type="button"
                    aria-label={
                      series.kind === 'pause'
                        ? `Editar pausa ${seriesIndex + 1}`
                        : `Editar serie ${seriesIndex + 1}`
                    }
                    onClick={() =>
                      series.kind === 'pause'
                        ? setPauseForm({
                            blockId: block.id,
                            seriesId: series.id,
                            time: series.interval,
                          })
                        : setEditing({ blockId: block.id, series })
                    }
                    className="flex min-h-11 min-w-0 flex-1 items-center py-1 text-left focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                  >
                    {series.kind === 'pause' ? (
                      <PauseDivider series={series} />
                    ) : (
                      <SeriesContent series={series} />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar serie ${seriesIndex + 1}`}
                    onClick={() =>
                      update(block.id, {
                        series: block.series.filter((item) => item.id !== series.id),
                      })
                    }
                    className="grid size-11 shrink-0 place-items-center rounded-full text-(--c-text-2)"
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                </div>
              )}
            </SortableList>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={block.series.length >= 30}
                onClick={() => setEditing({ blockId: block.id })}
                className="min-h-11 flex-1 rounded-xl border border-dashed border-(--c-aqua-strong) text-sm font-bold text-(--c-ocean) disabled:opacity-50"
              >
                + Serie
              </button>
              <button
                type="button"
                disabled={block.series.length >= 30}
                onClick={() => setPauseForm({ blockId: block.id, time: '' })}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-dashed border-(--c-border) px-4 text-sm font-semibold text-(--c-text-2) disabled:opacity-50"
              >
                <PauseIcon /> Pausa
              </button>
            </div>
          </fieldset>
        )}
      </SortableList>
      <button
        type="button"
        disabled={disabled || blocks.length >= 20}
        onClick={() =>
          onChange([...blocks, { id: crypto.randomUUID(), repetitions: 1, series: [] }])
        }
        className="min-h-14 w-full rounded-2xl border border-dashed border-(--c-aqua-strong) text-sm font-bold text-(--c-ocean) disabled:opacity-50"
      >
        + Agregar bloque
      </button>
      {transferBlockId &&
        blocks.some((block) => block.id === transferBlockId) &&
        createPortal(
          <WorkoutTransferSheet
            workout={{
              id: transferBlockId,
              title: blocks.find((block) => block.id === transferBlockId)?.title || 'Bloque',
              blocks: blocks.filter((block) => block.id === transferBlockId),
            }}
            allowImport={blocks.length < 20}
            maxImportBlocks={20 - blocks.length}
            disabled={disabled}
            onClose={() => setTransferBlockId(null)}
            onImport={(workout) => {
              const index = blocks.findIndex((block) => block.id === transferBlockId)
              onChange([
                ...blocks.slice(0, index + 1),
                ...workout.blocks,
                ...blocks.slice(index + 1),
              ])
              setTransferBlockId(null)
            }}
          />,
          document.body
        )}
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
    </section>
  )
}
