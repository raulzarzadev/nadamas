'use client'

import type { KeyboardEvent, PointerEvent } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'

export interface TimelineRange {
  startDate: string
  endDate: string
}
const day = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000
const date = (value: number) => new Date(value * 86_400_000).toISOString().slice(0, 10)
const dateLabel = (value: number) =>
  new Date(value * 86_400_000).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
type DragMode = 'draw' | 'move' | 'start' | 'end'

/** Controlled day range. Drag the empty track to draw, the bar to move or either end to resize. */
export default function TimelineRangeInput({
  min,
  max,
  value,
  onChange,
  label = 'Periodo',
  disabled = false,
  compact = false,
  onActivate,
  barLabel,
  onEditLabel,
  thick = false,
  tone = 'blue',
  snapDates = [],
  onSnap,
}: {
  min: string
  max: string
  value: TimelineRange
  onChange: (value: TimelineRange) => void
  label?: string
  disabled?: boolean
  compact?: boolean
  onActivate?: () => void
  barLabel?: string
  onEditLabel?: () => void
  thick?: boolean
  tone?: 'blue' | 'green'
  snapDates?: string[]
  onSnap?: (date: string | null) => void
}) {
  const [snappedDay, setSnappedDay] = useState<number | null>(null)
  const guideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (guideTimer.current) clearTimeout(guideTimer.current)
    },
    []
  )
  const id = useId()
  const track = useRef<HTMLFieldSetElement>(null)
  const drag = useRef<{
    mode: DragMode
    anchor: number
    start: number
    end: number
    original: TimelineRange
  } | null>(null)
  const lower = day(min),
    upper = day(max)
  const valid = Number.isFinite(lower) && Number.isFinite(upper) && upper >= lower
  const total = upper - lower + 1
  const start = day(value.startDate),
    end = day(value.endDate)
  const selected =
    valid &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end >= start &&
    start >= lower &&
    end <= upper
  const clamp = (value: number) => Math.max(lower, Math.min(upper, value))
  const emit = (start: number, end: number) =>
    onChange({ startDate: date(start), endDate: date(end) })
  const pointerDay = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect()
    if (!rect?.width) return lower
    return clamp(lower + Math.floor(((clientX - rect.left) / rect.width) * total))
  }
  const emitPointer = (rangeStart: number, rangeEnd: number, mode: DragMode) => {
    const width = track.current?.getBoundingClientRect().width ?? 0
    // Eight screen pixels feels consistent across different season lengths.
    const tolerance = width > 0 ? Math.min(3, (8 / width) * total) : 0
    const targets = snapDates
      .map(day)
      .filter((target) => Number.isFinite(target) && target >= lower && target <= upper)
    let bestDelta: number | null = null
    let bestTarget: number | null = null
    for (const edge of mode === 'start'
      ? [rangeStart]
      : mode === 'end'
        ? [rangeEnd]
        : [rangeStart, rangeEnd]) {
      for (const target of targets) {
        const delta = target - edge
        const nextStart = mode === 'end' ? rangeStart : rangeStart + delta
        const nextEnd = mode === 'start' ? rangeEnd : rangeEnd + delta
        if (
          Math.abs(delta) <= tolerance &&
          nextStart >= lower &&
          nextEnd <= upper &&
          nextStart <= nextEnd &&
          (bestDelta === null || Math.abs(delta) < Math.abs(bestDelta))
        ) {
          bestDelta = delta
          bestTarget = target
        }
      }
    }
    setSnappedDay(bestTarget)
    onSnap?.(bestTarget === null ? null : date(bestTarget))
    const delta = bestDelta ?? 0
    emit(
      mode === 'end' ? rangeStart : rangeStart + delta,
      mode === 'start' ? rangeEnd : rangeEnd + delta
    )
  }
  function begin(event: PointerEvent<HTMLFieldSetElement>) {
    if (disabled || !valid || event.button !== 0) return
    if (guideTimer.current) clearTimeout(guideTimer.current)
    setSnappedDay(null)
    onSnap?.(null)
    onActivate?.()
    const mode = (event.target as HTMLElement).closest<HTMLElement>('[data-range-action]')?.dataset
      .rangeAction as DragMode | undefined
    const anchor = pointerDay(event.clientX)
    drag.current = {
      mode: selected && mode ? mode : 'draw',
      anchor,
      start,
      end,
      original: { ...value },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!mode || !selected) emit(anchor, anchor)
  }
  function move(event: PointerEvent<HTMLFieldSetElement>) {
    const state = drag.current
    if (!state) return
    const current = pointerDay(event.clientX)
    if (state.mode === 'draw')
      emitPointer(
        Math.min(state.anchor, current),
        Math.max(state.anchor, current),
        current < state.anchor ? 'start' : 'end'
      )
    else if (state.mode === 'start') emitPointer(Math.min(current, state.end), state.end, 'start')
    else if (state.mode === 'end') emitPointer(state.start, Math.max(current, state.start), 'end')
    else {
      const delta = Math.max(
        lower - state.start,
        Math.min(upper - state.end, current - state.anchor)
      )
      emitPointer(state.start + delta, state.end + delta, 'move')
    }
  }
  function keyboard(event: KeyboardEvent<HTMLElement>, mode: Exclude<DragMode, 'draw'>) {
    if (disabled || !selected) return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const delta = (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 7 : 1)
    if (mode === 'start')
      emit(
        event.key === 'Home'
          ? lower
          : event.key === 'End'
            ? end
            : Math.min(end, clamp(start + delta)),
        end
      )
    else if (mode === 'end')
      emit(
        start,
        event.key === 'Home'
          ? start
          : event.key === 'End'
            ? upper
            : Math.max(start, clamp(end + delta))
      )
    else {
      const shift =
        event.key === 'Home'
          ? lower - start
          : event.key === 'End'
            ? upper - end
            : Math.max(lower - start, Math.min(upper - end, delta))
      emit(start + shift, end + shift)
    }
  }
  return (
    <fieldset disabled={disabled} className="min-w-0" aria-label={label}>
      <legend className="sr-only">{label}</legend>
      {valid ? (
        <>
          <div className={compact ? 'sr-only' : 'flex items-center justify-between gap-2'}>
            <p id={`${id}-help`} className="text-[10px] text-(--c-text-2)">
              Arrastra para dibujar, mover o ajustar la barra.
            </p>
            <button
              type="button"
              tabIndex={compact ? -1 : undefined}
              disabled={disabled}
              onClick={() => onChange({ startDate: '', endDate: '' })}
              className="min-h-11 shrink-0 px-2 text-[10px] font-semibold text-(--c-aqua-strong) hover:underline focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
            >
              Dibujar barra
            </button>
          </div>
          <fieldset
            ref={track}
            aria-label="Línea de tiempo editable"
            aria-describedby={`${id}-help`}
            className={`relative m-0 ${compact ? (barLabel || thick ? 'h-8' : 'h-5') : 'h-12'} w-full min-w-0 touch-none select-none border-0 p-0 ${disabled ? 'opacity-50' : 'cursor-crosshair'}`}
            onPointerDown={begin}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = null
              guideTimer.current = setTimeout(() => {
                setSnappedDay(null)
                onSnap?.(null)
              }, 900)
            }}
            onPointerCancel={() => {
              setSnappedDay(null)
              onSnap?.(null)
              const original = drag.current?.original
              drag.current = null
              if (original) onChange(original)
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-(--c-border)"
            />
            {snappedDay !== null && !onSnap && (
              <div
                className="pointer-events-none absolute -inset-y-2 z-[25] w-px"
                style={{
                  left: `${((snappedDay - lower) / total) * 100}%`,
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, var(--c-ocean) 0 3px, transparent 3px 6px)',
                  opacity: 0.7,
                }}
              ></div>
            )}
            {selected && (
              <div
                className="absolute top-0 h-full min-w-0"
                style={{
                  left: `${((start - lower) / total) * 100}%`,
                  width: `${((end - start + 1) / total) * 100}%`,
                }}
              >
                <button
                  type="button"
                  data-range-action="move"
                  aria-label="Mover periodo"
                  disabled={disabled}
                  onKeyDown={(event) => keyboard(event, 'move')}
                  className={`absolute inset-x-0 top-1/2 ${barLabel || thick ? 'h-8' : 'h-3'} -translate-y-1/2 cursor-grab rounded-full ${tone === 'green' ? 'bg-[#258575]' : 'bg-(--c-aqua-strong)'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) active:cursor-grabbing`}
                >
                  {barLabel && (
                    <span className="block truncate pl-6 pr-12 text-left text-[10px] font-semibold text-white">
                      {barLabel}
                    </span>
                  )}
                </button>
                {onEditLabel && (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Editar nombre de ${barLabel || label}`}
                    className="absolute right-6 top-1/2 z-10 grid h-8 w-6 -translate-y-1/2 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={onEditLabel}
                  >
                    <FiEdit2 aria-hidden="true" className="size-3" />
                  </button>
                )}
                {(['start', 'end'] as const).map((mode) => (
                  <span
                    key={mode}
                    role="slider"
                    tabIndex={disabled ? -1 : 0}
                    data-range-action={mode}
                    aria-label={mode === 'start' ? 'Inicio del periodo' : 'Final del periodo'}
                    aria-disabled={disabled}
                    aria-valuemin={mode === 'start' ? lower : start}
                    aria-valuemax={mode === 'start' ? end : upper}
                    aria-valuenow={mode === 'start' ? start : end}
                    aria-valuetext={dateLabel(mode === 'start' ? start : end)}
                    onKeyDown={(event) => keyboard(event, mode)}
                    className={`absolute top-1/2 grid h-11 w-6 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-(--c-ocean) ${mode === 'start' ? 'left-0' : 'right-0'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-6 w-2 rounded-full border-2 ${tone === 'green' ? 'border-[#258575]' : 'border-(--c-aqua-strong)'} bg-white`}
                    />
                  </span>
                ))}
              </div>
            )}
          </fieldset>
          <p aria-live="polite" className={compact ? 'sr-only' : 'text-[10px] text-(--c-text-2)'}>
            {selected
              ? `${dateLabel(start)} — ${dateLabel(end)}`
              : 'Dibuja un periodo en la línea de tiempo.'}
          </p>
        </>
      ) : (
        <p className="text-[10px] text-(--c-text-2)">
          Define las fechas del ciclo principal para dibujar barras.
        </p>
      )}
    </fieldset>
  )
}
