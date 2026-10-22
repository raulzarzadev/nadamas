'use client'

import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { FiRepeat } from 'react-icons/fi'

type NumberStepperProps = {
  focusOnMount?: boolean
  compact?: boolean
  id?: string
  name?: string
  label: string
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  required?: boolean
  disabled?: boolean
  decreaseLabel?: string
  increaseLabel?: string
}

/** Keeps an editable text draft so clearing the field never inserts a zero. */
export default function NumberStepper({
  focusOnMount = false,
  compact = false,
  id,
  name,
  label,
  value,
  onValueChange,
  min = 1,
  max,
  step = 1,
  required = false,
  disabled = false,
  decreaseLabel = `Reducir ${label.toLocaleLowerCase('es')}`,
  increaseLabel = `Aumentar ${label.toLocaleLowerCase('es')}`,
}: NumberStepperProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pulse = useRef<Animation | null>(null)
  useEffect(() => () => pulse.current?.cancel(), [])
  useEffect(() => {
    if (!focusOnMount) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [focusOnMount])
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const current = draft === '' ? null : Number(draft)
  const changeBy = (delta: number) => {
    const next = Math.max(min, Math.min(max ?? Infinity, current === null ? min : current + delta))
    if (current === next) return false
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pulse.current?.cancel()
      pulse.current =
        inputRef.current?.animate([{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }], {
          duration: 140,
          easing: 'ease-out',
        }) ?? null
    }
    setDraft(String(next))
    onValueChange(next)
    return true
  }
  const changeRef = useRef(changeBy)
  useEffect(() => {
    changeRef.current = changeBy
  })
  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerHandled = useRef(false)
  const stopHold = useCallback(() => {
    if (repeatTimer.current !== null) clearTimeout(repeatTimer.current)
    repeatTimer.current = null
  }, [])
  useEffect(() => {
    if (disabled) stopHold()
    const onVisibility = () => {
      if (document.hidden) stopHold()
    }
    window.addEventListener('blur', stopHold)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopHold()
      window.removeEventListener('blur', stopHold)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [disabled, stopHold])
  const startHold = (event: PointerEvent<HTMLButtonElement>, delta: number) => {
    if (event.button !== 0 || !event.isPrimary || disabled) return
    event.preventDefault()
    stopHold()
    pointerHandled.current = true
    if (!changeBy(delta)) return
    const repeat = () => {
      if (!changeRef.current(delta)) {
        stopHold()
        return
      }
      repeatTimer.current = setTimeout(repeat, 100)
    }
    repeatTimer.current = setTimeout(repeat, 400)
  }
  const buttonEvents = (delta: number) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => startHold(event, delta),
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    onLostPointerCapture: stopHold,
    onBlur: stopHold,
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.detail === 0 || !pointerHandled.current) changeBy(delta)
      pointerHandled.current = false
    },
  })
  return (
    <div className={`grid min-w-0 gap-1 ${compact ? 'w-full' : 'shrink-0'}`}>
      <div
        data-number-stepper
        className={
          compact
            ? 'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-0.5'
            : 'flex min-w-0 shrink-0 items-center justify-center gap-1'
        }
      >
        <button
          type="button"
          aria-label={decreaseLabel}
          title="Mantén presionado para reducir"
          className={`inline-flex touch-none select-none h-11 min-h-11 min-w-0 shrink-0 items-center justify-center border border-(--c-border) bg-white p-0 text-lg text-(--c-ocean) outline-none active:bg-base-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:border-transparent disabled:bg-base-200 disabled:text-slate-400 ${compact ? 'w-full min-w-0 rounded-lg' : 'w-11 rounded-xl'}`}
          disabled={disabled || (current !== null && current <= min)}
          {...buttonEvents(-step)}
        >
          −
        </button>
        <div className={`relative min-w-0 ${compact ? 'w-full' : 'w-16'}`}>
          <input
            ref={inputRef}
            id={id}
            name={name}
            aria-label={label}
            type="number"
            inputMode={Number.isInteger(step) ? 'numeric' : 'decimal'}
            min={min}
            max={max}
            step={step}
            required={required}
            disabled={disabled}
            className={`box-border h-11 w-full ${compact ? 'text-lg' : 'text-2xl'} min-w-0 max-w-full rounded-lg border border-transparent bg-transparent px-1 hover:border-(--c-border) focus:border-primary focus:bg-white text-center font-semibold outline-none focus:ring-2 focus:ring-inset focus:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            placeholder="0"
            value={draft}
            onChange={(event) => {
              const next = event.target.value
              setDraft(next)
              if (next !== '' && Number.isFinite(Number(next))) onValueChange(Number(next))
            }}
          />
        </div>
        <button
          type="button"
          aria-label={increaseLabel}
          title="Mantén presionado para aumentar"
          className={`inline-flex touch-none select-none h-11 min-h-11 min-w-0 shrink-0 items-center justify-center border border-(--c-border) bg-white p-0 text-lg text-(--c-ocean) outline-none active:bg-base-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:border-transparent disabled:bg-base-200 disabled:text-slate-400 ${compact ? 'w-full min-w-0 rounded-lg' : 'w-11 rounded-xl'}`}
          disabled={disabled || (current !== null && max !== undefined && current >= max)}
          {...buttonEvents(step)}
        >
          +
        </button>
      </div>
      <span className="flex items-center justify-center gap-1 text-[9px] leading-tight text-slate-400">
        <FiRepeat aria-hidden="true" className="size-2 shrink-0" />
        Mantén presionado
      </span>
    </div>
  )
}
