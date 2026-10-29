'use client'

import { useEffect, useRef, useState } from 'react'
import DurationInput from '@/components/ui/duration-input'
import NumberStepper from '@/components/ui/number-stepper'
import SwimEquipmentIcon, { type SwimEquipment } from '@/components/ui/swim-equipment-icon'
import type { ClassTrainingSeries } from '@/lib/class-training'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'

const STEPS = ['Repeticiones', 'Distancia', 'Técnica', 'Material', 'Intervalo']
const MATERIALS: SwimEquipment[] = ['Tabla', 'Aletas', 'Paletas', 'Pull', 'Snorkel', 'Paracaídas']
const splitMaterials = (value?: string) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
// Every step but the repetitions can be skipped.
const OPTIONAL_STEPS = new Set([1, 2, 3, 4])
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
  const [measure, setMeasure] = useState<'distance' | 'time'>(
    initial?.durationSeconds ? 'time' : 'distance'
  )
  const [intervalType, setIntervalType] = useState<'interval' | 'rest'>(
    initial?.intervalType ?? (initial?.durationSeconds ? 'rest' : 'interval')
  )
  const techniqueInput = useRef<HTMLInputElement>(null)
  const materialInput = useRef<HTMLInputElement>(null)
  // Techniques/materials this coach typed with "Otro" before, shown as extra chips.
  const [customTechniques, setCustomTechniques] = useState<string[]>([])
  const [customMaterials, setCustomMaterials] = useState<string[]>([])
  useEffect(() => {
    let active = true
    getAuthed('/api/coach/training-techniques')
      .then(
        (response) => response.json() as Promise<{ techniques?: string[]; materials?: string[] }>
      )
      .then((payload) => {
        if (!active) return
        setCustomTechniques(payload.techniques || [])
        setCustomMaterials(payload.materials || [])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (step === 2 || step === 3) {
      const frame = requestAnimationFrame(() => {
        const input = step === 2 ? techniqueInput.current : materialInput.current
        input?.focus()
      })
      return () => cancelAnimationFrame(frame)
    }
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
        Number(minutes) > 0 || Number(seconds) > 0
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
  const selectedComplement = ['Brazada', 'Patada', 'Técnica', 'Velocidad'].find((part) =>
    draft.exercise.toLocaleLowerCase().includes(part.toLocaleLowerCase())
  )
  const chooseTechnique = (style: string, complement?: string) =>
    setDraft({
      ...draft,
      exercise: complement ? `${complement} de ${style.toLocaleLowerCase()}` : style,
    })
  // Techniques/materials typed by hand (not from the chips) are remembered for this
  // coach's next series.
  const save = () => {
    const known = (list: string[], value: string) =>
      list.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())
    const technique = draft.exercise.trim()
    if (
      technique &&
      technique.length <= 60 &&
      !selectedStyle &&
      !selectedComplement &&
      !known(customTechniques, technique)
    )
      void postAuthed('/api/coach/training-techniques', {
        kind: 'techniques',
        values: [technique],
      }).catch(() => {})
    const newMaterials = splitMaterials(draft.material).filter(
      (item) => item.length <= 60 && !known(MATERIALS, item) && !known(customMaterials, item)
    )
    if (newMaterials.length)
      void postAuthed('/api/coach/training-techniques', {
        kind: 'materials',
        values: newMaterials,
      }).catch(() => {})
    onSave({ ...draft, intervalType })
  }
  const inputClass =
    'box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 text-base outline-none focus:border-(--c-ocean) focus:ring-2 focus:ring-(--c-ocean) focus:ring-inset'
  return (
    <section aria-label="Formulario de serie" className="grid gap-4">
      <h2 className="text-xl font-bold">Serie {seriesNumber}</h2>
      <p className="text-xs font-semibold text-(--c-text-2)" aria-live="polite">
        Paso {step + 1} de {STEPS.length}
      </p>
      <nav className="-my-4 flex gap-1" aria-label="Pasos de la serie">
        {STEPS.map((label, index) => (
          <button
            type="button"
            key={label}
            aria-label={`Paso ${index + 1}: ${index === 4 && intervalType === 'rest' ? 'Descanso' : label}`}
            aria-current={index === step ? 'step' : undefined}
            disabled={!valid && index !== step}
            onClick={() => setStep(index)}
            className="flex min-h-11 min-w-0 flex-1 items-center rounded focus-visible:outline-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
          >
            <span
              className={`h-1 w-full rounded-full ${index <= step ? 'bg-(--c-ocean)' : 'bg-(--c-border)'}`}
            />
          </button>
        ))}
      </nav>
      <p role="status" aria-live="polite" className="text-xs leading-relaxed text-(--c-text-2)">
        {[
          draft.repetitions > 0 &&
            (draft.durationSeconds
              ? `${draft.repetitions} × ${Math.floor(draft.durationSeconds / 60)}:${String(draft.durationSeconds % 60).padStart(2, '0')} min`
              : draft.distanceMeters
                ? `${draft.repetitions} × ${draft.distanceMeters} m`
                : `${draft.repetitions} ${draft.repetitions === 1 ? 'repetición' : 'repeticiones'}`),
          draft.exercise.trim(),
          draft.material?.trim() && `Con ${draft.material.trim()}`,
          draft.zone,
          draft.interval?.trim() &&
            `${intervalType === 'rest' ? 'Descanso' : 'Intervalo'} ${draft.interval.trim()}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <h3 ref={heading} tabIndex={-1} className="text-lg font-bold outline-none">
        {step === 1 && measure === 'time'
          ? 'Tiempo'
          : step === 4 && intervalType === 'rest'
            ? 'Descanso'
            : STEPS[step]}
        {OPTIONAL_STEPS.has(step) && (
          <span className="ml-1 text-sm font-normal text-(--c-text-2)">(opcional)</span>
        )}
      </h3>
      {step === 0 && (
        <NumberStepper
          focusOnMount
          label="¿Cuántas repeticiones?"
          value={draft.repetitions}
          min={1}
          max={999}
          required
          onValueChange={(repetitions) => setDraft({ ...draft, repetitions })}
        />
      )}
      {step === 1 && (
        <div className="grid min-w-0 gap-2">
          <fieldset className="flex rounded-full border border-(--c-border) bg-(--c-surface) p-1">
            <legend className="sr-only">Medida de la serie</legend>
            {(['distance', 'time'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={measure === option}
                onClick={() => {
                  if (option === measure) return
                  setMeasure(option)
                  setIntervalMinutes('')
                  setIntervalSeconds('')
                  setIntervalType(option === 'time' ? 'rest' : 'interval')
                  setDraft({ ...draft, distanceMeters: null, durationSeconds: null, interval: '' })
                }}
                className={`min-h-10 flex-1 rounded-full text-sm font-bold ${measure === option ? 'bg-(--c-ocean) text-white' : 'text-(--c-ocean)'}`}
              >
                {option === 'distance' ? 'Distancia' : 'Tiempo'}
              </button>
            ))}
          </fieldset>
          {measure === 'time' ? (
            <>
              <p className="text-xs text-(--c-text-2)">Tiempo por repetición</p>
              <DurationInput
                minutes={String(Math.floor((draft.durationSeconds || 0) / 60))}
                seconds={String((draft.durationSeconds || 0) % 60)}
                onChange={(minutes, seconds) => {
                  const durationSeconds = Number(minutes) * 60 + Number(seconds)
                  setDraft({ ...draft, durationSeconds: durationSeconds || null })
                }}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-(--c-text-2)">Metros por repetición</p>
              <NumberStepper
                focusOnMount
                label="Metros por repetición"
                value={draft.distanceMeters ?? 0}
                min={0}
                max={100000}
                step={25}
                onValueChange={(distanceMeters) =>
                  setDraft({ ...draft, distanceMeters: distanceMeters > 0 ? distanceMeters : null })
                }
              />
            </>
          )}
        </div>
      )}
      {step === 2 && (
        <div className="-mt-3 grid gap-3">
          <label className="grid gap-2 text-sm font-semibold">
            <span className="sr-only">Técnica o ejercicio (opcional)</span>
            <input
              ref={techniqueInput}
              key="technique"
              maxLength={200}
              placeholder="Patada de crol"
              value={draft.exercise}
              onChange={(event) => setDraft({ ...draft, exercise: event.target.value })}
              className={inputClass}
            />
          </label>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-2 text-sm text-(--c-text-2)">
              Zona de intensidad (opcional)
            </legend>
            {(['Z1', 'Z2', 'Z3', 'Z4', 'Z5'] as const).map((zone) => (
              <button
                key={zone}
                type="button"
                aria-pressed={draft.zone === zone}
                onClick={() => setDraft({ ...draft, zone: draft.zone === zone ? undefined : zone })}
                className={`min-h-11 min-w-11 rounded-full border px-4 text-sm font-bold ${draft.zone === zone ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean)'}`}
              >
                {zone}
              </button>
            ))}
          </fieldset>
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="mb-1 text-xs font-semibold text-(--c-text-2)">Comunes</legend>
            {styles.map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={selectedStyle === style}
                onClick={() => chooseTechnique(style, selectedComplement)}
                className={`btn border h-9 min-h-9 px-3 text-xs ${selectedStyle === style ? 'btn-primary' : 'btn-outline'}`}
              >
                {style}
              </button>
            ))}
            {customTechniques.map((technique) => (
              <button
                key={technique}
                type="button"
                aria-pressed={draft.exercise.trim() === technique}
                onClick={() =>
                  setDraft({
                    ...draft,
                    exercise: draft.exercise.trim() === technique ? '' : technique,
                  })
                }
                className={`btn border h-9 min-h-9 px-3 text-xs ${draft.exercise.trim() === technique ? 'btn-primary' : 'btn-outline'}`}
              >
                {technique}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setDraft({ ...draft, exercise: '' })
                techniqueInput.current?.focus()
              }}
              className="btn btn-outline border h-9 min-h-9 px-3 text-xs"
            >
              Otro
            </button>
          </fieldset>
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="mb-1 text-xs font-semibold text-(--c-text-2)">Complementos</legend>
            {['Brazada', 'Patada', 'Técnica', 'Velocidad'].map((complement) => (
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
                className={`btn border h-9 min-h-9 px-3 text-xs ${selectedComplement === complement ? 'btn-primary' : 'btn-outline'}`}
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
            <span className="sr-only">Material (opcional)</span>
            <input
              ref={materialInput}
              key="material"
              maxLength={120}
              placeholder="Tabla, aletas…"
              value={draft.material || ''}
              onChange={(event) => setDraft({ ...draft, material: event.target.value })}
              className={inputClass}
            />
          </label>
          <fieldset aria-label="Sugerencias de material" className="flex flex-wrap gap-1.5">
            {[...MATERIALS, ...customMaterials].map((material) => {
              const selected = splitMaterials(draft.material)
              const checked = selected.some(
                (item) => item.toLocaleLowerCase() === material.toLocaleLowerCase()
              )
              const preset = (MATERIALS as string[]).includes(material)
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
                  className={`btn border h-9 min-h-9 px-3 text-xs gap-1.5 ${checked ? 'btn-primary' : 'btn-outline'}`}
                >
                  {preset && <SwimEquipmentIcon equipment={material as SwimEquipment} />}
                  {material}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => {
                const selected = splitMaterials(draft.material)
                const next = selected.length ? `${selected.join(', ')}, ` : ''
                setDraft({ ...draft, material: next })
                const input = materialInput.current
                if (!input) return
                input.focus()
                requestAnimationFrame(() => input.setSelectionRange(next.length, next.length))
              }}
              className="btn btn-outline border h-9 min-h-9 px-3 text-xs"
            >
              Otro
            </button>
          </fieldset>
          <p className="text-xs text-(--c-text-2)">
            Puedes elegir varios materiales o escribir otro con «Otro».
          </p>
        </div>
      )}
      {step === 4 && (
        <div className="grid gap-3">
          <fieldset className="flex rounded-full border border-(--c-border) bg-(--c-surface) p-1">
            <legend className="sr-only">Tipo de tiempo entre repeticiones</legend>
            {(['interval', 'rest'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={intervalType === option}
                onClick={() => setIntervalType(option)}
                className={`min-h-10 flex-1 rounded-full text-sm font-bold ${intervalType === option ? 'bg-(--c-ocean) text-white' : 'text-(--c-ocean)'}`}
              >
                {option === 'interval' ? 'Intervalo' : 'Descanso'}
              </button>
            ))}
          </fieldset>
          <p className="text-xs text-(--c-text-2)">
            {intervalType === 'rest'
              ? 'Descanso entre cada repetición.'
              : 'Tiempo entre el inicio de una repetición y la siguiente.'}
          </p>
          <DurationInput
            focusOnMount
            minutes={intervalMinutes}
            seconds={intervalSeconds}
            onChange={setInterval}
          />
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
        <button
          type="button"
          disabled={!valid}
          onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : save())}
          className="btn border btn-primary ml-auto min-h-11"
        >
          {step === STEPS.length - 1 ? 'Guardar serie' : 'Siguiente'}
        </button>
      </div>
    </section>
  )
}
