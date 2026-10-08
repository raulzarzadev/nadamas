'use client'

import { useEffect, useRef, useState } from 'react'
import SwimEquipmentIcon, { type SwimEquipment } from '@/components/ui/swim-equipment-icon'
import type { ClassTrainingSeries } from '@/lib/class-training'

const STEPS = ['Repeticiones', 'Distancia', 'Técnica', 'Material', 'Intervalo']
export default function TrainingSeriesForm({
  initial,
  seriesNumber = 1,
  onSave,
  onCancel,
}: {
  initial?: ClassTrainingSeries
  seriesNumber?: number
  onSave: (series: ClassTrainingSeries) => void
  onCancel: () => void
}) {
  const [step, setStep] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (step >= 0) heading.current?.focus()
  }, [step])
  const [draft, setDraft] = useState<ClassTrainingSeries>(
    () =>
      initial || {
        id: crypto.randomUUID(),
        repetitions: 1,
        distanceMeters: null,
        exercise: '',
        material: '',
        interval: '',
      }
  )
  const [intervalMinutes, setIntervalMinutes] = useState(() => {
    const interval = initial?.interval || ''
    const clock = interval.match(/^(\d+):(\d{2})$/)
    return clock?.[1] || interval.match(/(\d+)\s*min/i)?.[1] || ''
  })
  const [intervalSeconds, setIntervalSeconds] = useState(() => {
    const interval = initial?.interval || ''
    const clock = interval.match(/^(\d+):(\d{2})$/)
    return clock?.[2] || interval.match(/(\d+)\s*seg/i)?.[1] || ''
  })
  const setInterval = (minutes: string, seconds: string) => {
    setIntervalMinutes(minutes)
    setIntervalSeconds(seconds)
    setDraft({
      ...draft,
      interval:
        minutes || seconds
          ? `${Number(minutes || 0)}:${String(Number(seconds || 0)).padStart(2, '0')}`
          : '',
    })
  }
  const valid =
    step === 0
      ? Number.isInteger(draft.repetitions) && draft.repetitions > 0 && draft.repetitions <= 999
      : step === 1
        ? draft.distanceMeters === null ||
          (Number.isInteger(draft.distanceMeters) &&
            draft.distanceMeters > 0 &&
            draft.distanceMeters <= 100000)
        : step === 2
          ? Boolean(draft.exercise.trim())
          : step === 4
            ? (!intervalMinutes ||
                (Number.isInteger(Number(intervalMinutes)) &&
                  Number(intervalMinutes) >= 0 &&
                  Number(intervalMinutes) <= 999)) &&
              (!intervalSeconds ||
                (Number.isInteger(Number(intervalSeconds)) &&
                  Number(intervalSeconds) >= 0 &&
                  Number(intervalSeconds) <= 59))
            : true
  const styles = ['Crol', 'Dorso', 'Pecho', 'Mariposa']
  const selectedStyle = styles.find((style) =>
    draft.exercise.toLocaleLowerCase().includes(style.toLocaleLowerCase())
  )
  const selectedComplement = ['Brazada', 'Patada', 'Catch-up', 'Técnica', 'Velocidad'].find(
    (part) => draft.exercise.toLocaleLowerCase().includes(part.toLocaleLowerCase())
  )
  const chooseTechnique = (style: string, complement?: string) =>
    setDraft({
      ...draft,
      exercise: complement ? `${complement} de ${style.toLocaleLowerCase()}` : style,
    })
  const inputClass =
    'min-h-12 w-full rounded-xl border border-(--c-border) bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-(--c-ocean)'
  return (
    <section aria-label="Formulario de serie" className="grid gap-4">
      <h2 className="text-xl font-bold">Serie {seriesNumber}</h2>
      <p className="text-xs font-semibold text-(--c-text-2)" aria-live="polite">
        Paso {step + 1} de 5
      </p>
      <div className="flex gap-1" aria-hidden="true">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-(--c-ocean)' : 'bg-(--c-border)'}`}
          />
        ))}
      </div>
      <h3 ref={heading} tabIndex={-1} className="text-lg font-bold outline-none">
        {STEPS[step]}
      </h3>
      {step === 0 && (
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-semibold">
            ¿Cuántas repeticiones?
            <input
              key="repetitions"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={draft.repetitions || ''}
              onChange={(event) => setDraft({ ...draft, repetitions: Number(event.target.value) })}
              className={inputClass}
            />
          </label>
          <fieldset aria-label="Sugerencias de repeticiones" className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((repetitions) => (
              <button
                key={repetitions}
                type="button"
                aria-pressed={draft.repetitions === repetitions}
                onClick={() => setDraft({ ...draft, repetitions })}
                className={`btn border min-h-11 px-2 ${draft.repetitions === repetitions ? 'btn-primary' : 'btn-outline'}`}
              >
                {repetitions}
              </button>
            ))}
          </fieldset>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-2">
          <label className="grid gap-2 text-sm font-semibold">
            Distancia por repetición (metros, opcional)
            <input
              key="distance"
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              placeholder="50"
              value={draft.distanceMeters ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  distanceMeters: event.target.value ? Number(event.target.value) : null,
                })
              }
              className={inputClass}
            />
          </label>
          <fieldset aria-label="Sugerencias de distancia" className="grid grid-cols-4 gap-2">
            {[25, 50, 100, 200].map((distanceMeters) => (
              <button
                key={distanceMeters}
                type="button"
                aria-pressed={draft.distanceMeters === distanceMeters}
                onClick={() => setDraft({ ...draft, distanceMeters })}
                className={`btn border min-h-11 px-2 ${draft.distanceMeters === distanceMeters ? 'btn-primary' : 'btn-outline'}`}
              >
                {distanceMeters} m
              </button>
            ))}
          </fieldset>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-semibold">
            Técnica o ejercicio
            <input
              key="technique"
              maxLength={200}
              placeholder="Patada de crol"
              value={draft.exercise}
              onChange={(event) => setDraft({ ...draft, exercise: event.target.value })}
              className={inputClass}
            />
          </label>
          <fieldset className="flex flex-wrap gap-2" aria-label="Sugerencias de técnica">
            {styles.map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={selectedStyle === style}
                onClick={() => chooseTechnique(style, selectedComplement)}
                className={`btn border min-h-11 ${selectedStyle === style ? 'btn-primary' : 'btn-outline'}`}
              >
                {style}
              </button>
            ))}
          </fieldset>
          <p className="text-sm font-semibold">Complemento</p>
          <fieldset className="flex flex-wrap gap-2" aria-label="Complemento de técnica">
            {['Brazada', 'Patada', 'Catch-up', 'Técnica', 'Velocidad'].map((complement) => (
              <button
                key={complement}
                type="button"
                aria-pressed={selectedComplement === complement}
                onClick={() => {
                  if (selectedStyle)
                    chooseTechnique(
                      selectedStyle,
                      selectedComplement === complement ? undefined : complement
                    )
                  else
                    setDraft({
                      ...draft,
                      exercise: selectedComplement === complement ? '' : complement,
                    })
                }}
                className={`btn border min-h-11 ${selectedComplement === complement ? 'btn-primary' : 'btn-outline'}`}
              >
                {complement}
              </button>
            ))}
          </fieldset>
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-semibold">
            Material (opcional)
            <input
              key="material"
              maxLength={120}
              placeholder="Tabla, aletas…"
              value={draft.material || ''}
              onChange={(event) => setDraft({ ...draft, material: event.target.value })}
              className={inputClass}
            />
          </label>
          <fieldset aria-label="Sugerencias de material" className="flex flex-wrap gap-2">
            {(['Tabla', 'Aletas', 'Paletas', 'Pull', 'Snorkel'] as SwimEquipment[]).map(
              (material) => {
                const selected = (draft.material || '')
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)
                const checked = selected.some(
                  (item) => item.toLocaleLowerCase() === material.toLocaleLowerCase()
                )
                return (
                  <button
                    key={material}
                    type="button"
                    aria-pressed={checked}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        material: (checked
                          ? selected.filter(
                              (item) => item.toLocaleLowerCase() !== material.toLocaleLowerCase()
                            )
                          : [...selected, material]
                        ).join(', '),
                      })
                    }
                    className={`btn border min-h-11 gap-2 ${checked ? 'btn-primary' : 'btn-outline'}`}
                  >
                    <SwimEquipmentIcon equipment={material} />
                    {material}
                  </button>
                )
              }
            )}
          </fieldset>
          <p className="text-xs text-(--c-text-2)">
            Puedes elegir varios materiales o escribir otro.
          </p>
        </div>
      )}
      {step === 4 && (
        <div className="grid gap-3">
          <p className="text-sm text-(--c-text-2)">Intervalo opcional</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-2 text-sm font-semibold">
              Minutos
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={999}
                placeholder="0"
                value={intervalMinutes}
                onChange={(event) => setInterval(event.target.value, intervalSeconds)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Segundos
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                placeholder="00"
                value={intervalSeconds}
                onChange={(event) => setInterval(intervalMinutes, event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn border btn-ghost min-h-11">
          Cancelar
        </button>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="btn border btn-outline min-h-11"
          >
            Atrás
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            onClick={() => {
              setDraft({ ...draft, distanceMeters: null })
              setStep(2)
            }}
            className="btn border btn-outline ml-auto min-h-11"
          >
            Sin distancia
          </button>
        )}
        <button
          type="button"
          disabled={!valid}
          onClick={() => (step < 4 ? setStep(step + 1) : onSave(draft))}
          className={`btn border btn-primary min-h-11 ${step === 1 ? '' : 'ml-auto'}`}
        >
          {step === 4 ? 'Guardar serie' : 'Siguiente'}
        </button>
      </div>
    </section>
  )
}
