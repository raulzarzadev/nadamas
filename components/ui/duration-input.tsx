'use client'

const fieldClass =
  'box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 text-base font-normal outline-none focus:border-(--c-ocean) focus:ring-2 focus:ring-(--c-ocean) focus:ring-inset'

export default function DurationInput({
  minutes,
  seconds,
  onChange,
  disabled = false,
}: {
  minutes: string
  seconds: string
  onChange: (minutes: string, seconds: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2">
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        Minutos
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          placeholder="0"
          disabled={disabled}
          value={minutes}
          onChange={(event) => onChange(event.target.value, seconds)}
          className={fieldClass}
        />
      </label>
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        Segundos
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          placeholder="00"
          disabled={disabled}
          value={seconds}
          onChange={(event) => onChange(minutes, event.target.value)}
          className={fieldClass}
        />
      </label>
    </div>
  )
}
