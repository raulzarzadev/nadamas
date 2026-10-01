'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { FiCheck, FiPlus, FiX } from 'react-icons/fi'
import { HOUR_OPTIONS } from '@/lib/coach-offerings'

const focusClass =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ocean)]'

const HOUR_GROUPS = [
  { label: 'Mañana', range: '06:00 – 11:30', from: '06:00', to: '12:00' },
  { label: 'Tarde', range: '12:00 – 17:30', from: '12:00', to: '18:00' },
  { label: 'Noche', range: '18:00 – 21:30', from: '18:00', to: '22:00' },
] as const

export default function HourPickerModal({
  existingTimes,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  existingTimes: Set<string>
  busy: boolean
  error?: string | null
  selectedDates?: string[]
  onClose: () => void
  onSubmit: (times: string[]) => void
}) {
  const id = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const [showHalfHours, setShowHalfHours] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const wholeHourOptions = HOUR_OPTIONS.filter((time) => time.endsWith(':00'))
  const hourOptions = showHalfHours ? HOUR_OPTIONS : wholeHourOptions
  const times = [...selected].sort()

  const toggleTime = (time: string) => {
    if (existingTimes.has(time)) return
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(time)) next.delete(time)
      else next.add(time)
      return next
    })
  }

  const toggleHalfHours = () => {
    if (showHalfHours) {
      setSelected((current) => new Set([...current].filter((time) => time.endsWith(':00'))))
    }
    setShowHalfHours((current) => !current)
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => previous?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(10,37,64,0.58)] p-3 backdrop-blur-sm sm:items-center">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white text-[var(--c-ocean)] shadow-[var(--shadow-md)]"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            if (!busy) onClose()
          }
          if (event.key === 'Tab') {
            const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
            if (!controls?.length) return
            const first = controls[0]
            const last = controls[controls.length - 1]
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first.focus()
            }
          }
        }}
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h3 id={`${id}-title`} className="text-xl font-bold">
              Agregar horas
            </h3>
            <p id={`${id}-description`} className="mt-1 text-sm text-[var(--c-text-2)]">
              Selecciona las horas en las que puedes dar clase.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Cerrar selector de horas"
            className={`grid size-11 shrink-0 place-items-center rounded-full hover:bg-[var(--c-surface)] ${focusClass}`}
          >
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5">
          <button
            type="button"
            onClick={toggleHalfHours}
            aria-pressed={showHalfHours}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[var(--c-text-2)] underline decoration-[var(--c-aqua)] decoration-2 underline-offset-4 transition-colors hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)] ${focusClass}`}
          >
            <FiPlus aria-hidden="true" className="text-sm" />
            {showHalfHours ? 'Ocultar medias horas' : 'Agregar medias horas'}
          </button>

          <div className="mt-5 space-y-5">
            {HOUR_GROUPS.map((group) => {
              const groupTimes = hourOptions.filter((time) => time >= group.from && time < group.to)
              return (
                <fieldset key={group.label}>
                  <legend className="mb-2 flex items-baseline gap-2">
                    <span className="text-sm font-bold">{group.label}</span>
                    <span className="text-xs text-[var(--c-text-2)]">{group.range}</span>
                  </legend>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {groupTimes.map((time) => {
                      const alreadyAdded = existingTimes.has(time)
                      const active = selected.has(time)
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={alreadyAdded}
                          aria-label={`${time}${alreadyAdded ? ', ya agregado' : ''}`}
                          aria-pressed={active}
                          onClick={() => toggleTime(time)}
                          className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border text-sm font-bold transition-colors ${focusClass} ${
                            alreadyAdded
                              ? 'cursor-not-allowed border-[var(--c-border)] bg-slate-100 text-slate-400'
                              : active
                                ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                                : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)]'
                          }`}
                        >
                          {time}
                          {active && <FiCheck aria-hidden="true" />}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })}
          </div>

          <div
            className="mt-5 rounded-xl bg-[var(--c-surface)] p-4"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-bold">
              {times.length
                ? `${times.length} ${times.length === 1 ? 'horario para agregar' : 'horarios para agregar'}`
                : 'Selecciona al menos un horario nuevo'}
            </p>
            {times.length > 0 && (
              <p className="mt-1 text-sm tabular-nums text-[var(--c-text-2)]">
                {times.join(' · ')}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-[var(--c-error,#b91c1c)]">
              {error}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--c-border)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`min-h-12 rounded-xl px-3 text-sm font-semibold hover:bg-[var(--c-surface)] ${focusClass}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!times.length || busy}
            onClick={() => onSubmit(times)}
            className={`min-h-12 flex-1 rounded-xl bg-[var(--c-ocean)] px-3 font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 ${focusClass}`}
          >
            {busy
              ? 'Agregando…'
              : times.length
                ? `Agregar ${times.length} ${times.length === 1 ? 'horario' : 'horarios'}`
                : 'Agregar horarios'}
          </button>
        </footer>
      </div>
    </div>
  )
}
