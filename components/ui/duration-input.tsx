'use client'

import { useId } from 'react'
import NumberStepper from '@/components/ui/number-stepper'

export default function DurationInput({
  minutes,
  seconds,
  onChange,
  disabled = false,
  focusOnMount = false,
}: {
  minutes: string
  seconds: string
  onChange: (minutes: string, seconds: string) => void
  disabled?: boolean
  focusOnMount?: boolean
}) {
  const id = useId()
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3">
      <div className="grid min-w-0 gap-2">
        <label htmlFor={`${id}-minutes`} className="text-sm font-semibold">
          Minutos
        </label>
        <NumberStepper
          compact
          id={`${id}-minutes`}
          label="Minutos"
          min={0}
          max={999}
          value={Number(minutes) || 0}
          disabled={disabled}
          focusOnMount={focusOnMount}
          onValueChange={(value) => onChange(String(value), seconds)}
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <label htmlFor={`${id}-seconds`} className="text-sm font-semibold">
          Segundos
        </label>
        <NumberStepper
          compact
          id={`${id}-seconds`}
          label="Segundos"
          min={0}
          max={59}
          value={Number(seconds) || 0}
          disabled={disabled}
          onValueChange={(value) => onChange(minutes, String(value))}
        />
      </div>
    </div>
  )
}
