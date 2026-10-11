'use client'

import Sheet from '@comps/ui/sheet'
import { useId, useState } from 'react'
import { FiCheck, FiPlus, FiX } from 'react-icons/fi'
import { HOUR_OPTIONS } from '@/lib/coach-offerings'

const focusClass =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ocean)]'

const HOUR_GROUPS = [
  { label: 'Mañana', range: '05:00 – 11:30', from: '05:00', to: '12:00' },
  { label: 'Tarde', range: '12:00 – 17:30', from: '12:00', to: '18:00' },
  { label: 'Noche', range: '18:00 – 22:00', from: '18:00', to: '22:30' },
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

  return (
    <Sheet
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      label="Agregar horas"
      keyboardAware
      fullBleedMobile
      closeDisabled={busy}
      showFooterClose={false}
      footer={
        <footer className="flex shrink-0 flex-col gap-3 border-t border-[var(--c-border)] px-4 py-3 text-[var(--c-ocean)] sm:px-0 sm:pb-0">
          <div
            className="px-1 text-xs leading-relaxed text-[var(--c-text-2)]"
            role="status"
            aria-live="polite"
          >
            <p>
              {times.length
                ? `${times.length} ${times.length === 1 ? 'horario para agregar' : 'horarios para agregar'}`
                : 'Selecciona al menos un horario nuevo'}
            </p>
            {times.length > 0 && (
              <p className="max-h-12 overflow-y-auto break-words tabular-nums">
                {times.join(' · ')}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-[var(--c-error,#b91c1c)]">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
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
          </div>
        </footer>
      }
    >
      <div className="flex w-full flex-col text-[var(--c-ocean)]">
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pt-2 sm:px-0 sm:pt-0">
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

        <div className="px-4 pt-1 pb-3 sm:px-0">
          <button
            type="button"
            onClick={toggleHalfHours}
            aria-pressed={showHalfHours}
            className={`ml-auto flex min-h-8 items-center gap-1 rounded-lg px-1 text-[11px] font-normal text-[var(--c-text-2)] transition-colors hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)] ${focusClass}`}
          >
            <FiPlus aria-hidden="true" className="text-xs" />
            {showHalfHours ? 'Ocultar medias horas' : 'Agregar medias horas'}
          </button>

          <div className="mt-0 space-y-4">
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
                          className={`flex min-h-9 items-center justify-center gap-1 rounded-lg border text-xs font-bold transition-colors ${focusClass} ${
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
        </div>
      </div>
    </Sheet>
  )
}
