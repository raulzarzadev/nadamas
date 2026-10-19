'use client'

import { useEffect, useRef, useState } from 'react'
import DurationInput from '@/components/ui/duration-input'
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
  const techniqueInput = useRef<HTMLInputElement>(null)
  const materialInput = useRef<HTMLInputElement>(null)
  const distanceInput = useRef<HTMLInputElement>(null)
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
    onSave(draft)
  }
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
      <p role="status" aria-live="polite" className="text-xs leading-relaxed text-(--c-text-2)">
        {[
          draft.repetitions > 0 &&
            (draft.distanceMeters
              ? `${draft.repetitions} × ${draft.distanceMeters} m`
              : `${draft.repetitions} ${draft.repetitions === 1 ? 'repetición' : 'repeticiones'}`),
          draft.exercise.trim(),
          draft.material?.trim() && `Con ${draft.material.trim()}`,
          draft.interval?.trim() && `Intervalo ${draft.interval.trim()}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <h3 ref={heading} tabIndex={-1} className="text-lg font-bold outline-none">
        {STEPS[step]}
        {OPTIONAL_STEPS.has(step) && (
          <span className="ml-1 text-sm font-normal text-(--c-text-2)">(opcional)</span>
        )}
      </h3>
      {step === 0 && (
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-semibold">
            <span className="sr-only">¿Cuántas repeticiones?</span>
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
          <fieldset aria-label="Sumar repeticiones" className="grid grid-cols-4 gap-1.5">
            {[1, 2, 4, 8].map((step) => (
              <button
                key={step}
                type="button"
                aria-label={`Sumar ${step}`}
                onClick={() =>
                  setDraft({
                    ...draft,
                    repetitions: Math.min(999, (Number(draft.repetitions) || 0) + step),
                  })
                }
                className="btn btn-outline border h-9 min-h-9 px-3 text-xs"
              >
                +{step}
              </button>
            ))}
          </fieldset>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-2">
          <label className="grid gap-2 text-sm font-semibold">
            <span className="text-xs font-normal text-(--c-text-2)">Metros por repetición</span>
            <input
              ref={distanceInput}
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
          <fieldset
            aria-label="Sugerencias de distancia"
            className="series-distance-options grid grid-cols-3 gap-1 sm:grid-cols-6"
          >
            <button
              type="button"
              aria-pressed={draft.distanceMeters === null}
              onClick={() => setDraft({ ...draft, distanceMeters: null })}
              className={`btn border h-9 min-h-9 px-3 text-xs ${draft.distanceMeters === null ? 'btn-primary' : 'btn-outline'}`}
            >
              Sin
            </button>
            {[25, 50, 100, 200].map((distanceMeters) => (
              <button
                key={distanceMeters}
                type="button"
                aria-pressed={draft.distanceMeters === distanceMeters}
                onClick={() => setDraft({ ...draft, distanceMeters })}
                className={`btn border h-9 min-h-9 px-3 text-xs ${draft.distanceMeters === distanceMeters ? 'btn-primary' : 'btn-outline'}`}
              >
                {distanceMeters} m
              </button>
            ))}
            <button
              type="button"
              onClick={() => distanceInput.current?.focus()}
              className="btn btn-outline border h-9 min-h-9 px-3 text-xs"
            >
              Otro
            </button>
          </fieldset>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-3">
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
          <fieldset className="flex flex-wrap gap-1.5" aria-label="Sugerencias de técnica">
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
          <p className="text-sm font-semibold">
            Complemento <span className="font-normal text-(--c-text-2)">(opcional)</span>
          </p>
          <fieldset className="flex flex-wrap gap-1.5" aria-label="Complemento de técnica">
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
        <DurationInput minutes={intervalMinutes} seconds={intervalSeconds} onChange={setInterval} />
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
          onClick={() => (step < 4 ? setStep(step + 1) : save())}
          className="btn border btn-primary ml-auto min-h-11"
        >
          {step === 4 ? 'Guardar serie' : 'Siguiente'}
        </button>
      </div>
    </section>
  )
}
