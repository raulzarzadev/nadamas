'use client'

export interface CoachScheduleRowTime {
  key: string
  label: string
  active?: boolean
  disabled?: boolean
  ariaLabel?: string
  onClick?: () => void
}

export interface CoachScheduleRowDay {
  key: string
  dayLabel: string
  dateLabel: string
  times: CoachScheduleRowTime[]
}

export default function CoachScheduleRows({
  days,
  empty = 'No hay horarios publicados.',
}: {
  days: CoachScheduleRowDay[]
  empty?: string
}) {
  if (!days.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--c-border)] bg-white p-4 text-center text-sm text-[var(--c-text-2)]">
        {empty}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3">
      {days.map((day) => (
        <div key={day.key} className="grid gap-1 sm:grid-cols-[7rem_1fr]">
          <div>
            <p className="text-sm font-extrabold text-[var(--c-ocean)]">{day.dayLabel}</p>
            <p className="text-[10px] font-semibold text-[var(--c-text-2)]">{day.dateLabel}</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {day.times.map((time) => {
              const isInteractive = Boolean(time.onClick)

              return (
                <button
                  key={time.key}
                  type="button"
                  disabled={time.disabled}
                  aria-pressed={isInteractive ? time.active : undefined}
                  aria-label={time.ariaLabel}
                  onClick={time.onClick}
                  className={`min-h-9 rounded-xl border px-3 text-base font-extrabold leading-none transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] ${
                    time.disabled
                      ? 'cursor-not-allowed border-transparent text-slate-400 line-through decoration-2'
                      : time.active
                        ? 'border-[var(--c-aqua)] bg-[var(--c-aqua)] text-white shadow-[var(--shadow-sm)]'
                        : isInteractive
                          ? 'cursor-pointer border-[var(--c-aqua-light)] bg-white text-[var(--c-ocean)] hover:border-[var(--c-aqua)] hover:bg-[var(--c-surface)]'
                          : 'cursor-default border-[var(--c-border)] bg-white text-[var(--c-ocean)]'
                  }`}
                >
                  {time.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
