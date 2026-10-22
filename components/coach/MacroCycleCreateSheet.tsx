'use client'

import { useEffect, useId, useRef, useState } from 'react'
import DateInput from '@/components/ui/date-input'
import Sheet from '@/components/ui/sheet'
import {
  createMacroTemplate,
  type TrainingCycle,
  validateTrainingCycle,
} from '@/lib/training-planner'
import { buildDailySessions } from '@/lib/training-session-builder'

const fieldClass =
  'box-border w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-primary'
const sessionDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export default function MacroCycleCreateSheet({
  number,
  busy,
  error,
  onClose,
  onCreate,
}: {
  number: number
  busy: boolean
  error: string
  onClose: () => void
  onCreate: (cycles: TrainingCycle[]) => Promise<void>
}) {
  const id = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const [step, setStep] = useState(0)
  const [template, setTemplate] = useState<0 | 3 | 4>(0)
  const [validation, setValidation] = useState('')
  const [macro, setMacro] = useState<TrainingCycle>(() => {
    const now = new Date()
    return {
      id: crypto.randomUUID(),
      parentId: null,
      type: 'macro',
      title: `Temporada ${number}`,
      startDate: dateKey(now),
      endDate: dateKey(new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())),
      goal: '',
      content: '',
      sessionWeekdays: [],
    }
  })
  useEffect(() => {
    if (step > 0) heading.current?.focus()
  }, [step])
  const datesError = () =>
    !macro.startDate || !macro.endDate
      ? 'Selecciona la fecha de inicio y la fecha final.'
      : validateTrainingCycle(macro, [macro])
  const durationDays = datesError()
    ? 0
    : (Date.parse(`${macro.endDate}T00:00:00Z`) - Date.parse(`${macro.startDate}T00:00:00Z`)) /
        86400000 +
      1
  const weeks = Math.floor(durationDays / 7)
  const remainingDays = durationDays % 7
  const move = (next: number) => {
    const message =
      next > 0
        ? datesError() ||
          (!macro.sessionWeekdays?.length ? 'Selecciona al menos un día de sesión.' : '') ||
          (next > 1 && !macro.goal.trim() ? 'Escribe el título de la competencia objetivo.' : '')
        : ''
    if (message) {
      setValidation(message)
      return
    }
    setValidation('')
    setStep(next)
  }
  return (
    <Sheet
      open
      onClose={onClose}
      label="Crear MACRO-ciclo"
      keyboardAware
      closeDisabled={busy}
      footer={
        <div className="flex gap-2 pt-3">
          {step > 0 && (
            <button
              type="button"
              disabled={busy}
              className="btn btn-outline min-h-11"
              onClick={() => move(step - 1)}
            >
              Atrás
            </button>
          )}
          <button
            type="submit"
            form={`${id}-form`}
            disabled={busy}
            className="btn btn-primary min-h-11 flex-1"
          >
            {busy ? 'Creando…' : step < 2 ? 'Continuar' : 'Crear MACRO-ciclo'}
          </button>
        </div>
      }
    >
      <form
        id={`${id}-form`}
        className="grid min-w-0 grid-cols-1 gap-4 pb-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (busy) return
          if (step < 2) {
            move(step + 1)
            return
          }
          const message =
            datesError() ||
            (!macro.sessionWeekdays?.length ? 'Selecciona al menos un día de sesión.' : '') ||
            (!macro.goal.trim() ? 'Escribe el título de la competencia objetivo.' : '')
          if (message) {
            setValidation(message)
            return
          }
          const days =
            (Date.parse(`${macro.endDate}T00:00:00Z`) -
              Date.parse(`${macro.startDate}T00:00:00Z`)) /
              86400000 +
            1
          if (template && days < template * template * 2) {
            setValidation(
              `El machote necesita al menos ${template * template * 2} días para distribuir los ${template * template} microciclos. Amplía las fechas o desmarca la opción.`
            )
            return
          }
          setValidation('')
          const root = { ...macro, title: macro.goal.trim(), goal: '' }
          const cycles = template ? createMacroTemplate(root, undefined, template) : [root]
          void onCreate(
            cycles.map((cycle) =>
              cycle.type === 'micro' ? buildDailySessions(cycle, () => crypto.randomUUID()) : cycle
            )
          )
        }}
      >
        <h2 className="text-xl font-bold">Crear MACRO-ciclo</h2>
        <nav aria-label="Pasos del MACRO-ciclo" className="grid grid-cols-3 gap-2 text-xs">
          {['Fechas', 'Competencia', 'Machote'].map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={busy}
              aria-current={step === index ? 'step' : undefined}
              onClick={() => move(index)}
              className={`min-h-11 border-t-4 pt-2 text-left ${index <= step ? 'border-primary' : 'border-base-200 text-(--c-text-2)'}`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </nav>
        {step === 2 && (
          <section
            aria-label="Resumen de la temporada"
            className="grid gap-0.5 text-xs text-(--c-text-2)"
          >
            <p className="break-words font-medium">{macro.goal}</p>
            <p>
              {new Date(`${macro.startDate}T12:00:00`).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              —{' '}
              {new Date(`${macro.endDate}T12:00:00`).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </section>
        )}
        <h3 ref={heading} tabIndex={-1} className="font-semibold outline-none">
          {['Fechas de la temporada', 'Competencia objetivo', 'Crear un machote'][step]}
        </h3>
        <fieldset disabled={busy} className="grid w-full min-w-0 grid-cols-1 gap-3">
          {step === 0 && (
            <>
              <DateInput
                label="Fecha de inicio"
                value={macro.startDate}
                required
                onChange={(startDate) => setMacro({ ...macro, startDate })}
              />
              <DateInput
                label="Fecha final"
                value={macro.endDate}
                required
                min={macro.startDate || undefined}
                onChange={(endDate) => setMacro({ ...macro, endDate })}
              />
              {durationDays > 0 && (
                <p role="status" className="text-xs text-(--c-text-2)">
                  Duración: {weeks} {weeks === 1 ? 'semana' : 'semanas'}
                  {remainingDays > 0
                    ? ` y ${remainingDays} ${remainingDays === 1 ? 'día' : 'días'}`
                    : ''}
                  .
                </p>
              )}
              <fieldset className="grid min-w-0 grid-cols-1 gap-2">
                <legend className="mb-2 text-sm font-semibold">Días de sesión</legend>
                <div className="grid min-w-0 grid-cols-7 gap-1">
                  {sessionDays.map((label, day) => (
                    <label key={label} className="relative min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        aria-label={label}
                        checked={macro.sessionWeekdays?.includes(day) ?? false}
                        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        onChange={(event) =>
                          setMacro({
                            ...macro,
                            sessionWeekdays: event.target.checked
                              ? [...(macro.sessionWeekdays || []), day].sort((a, b) => a - b)
                              : (macro.sessionWeekdays || []).filter((value) => value !== day),
                          })
                        }
                      />
                      <span className="flex min-h-11 items-center justify-center rounded-lg border border-(--c-border) text-xs font-semibold peer-checked:border-(--c-ocean) peer-checked:bg-(--c-ocean) peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-(--c-text-2)">
                  El machote creará una sesión por fecha en los días seleccionados. Puedes editarlo
                  después.
                </p>
              </fieldset>
            </>
          )}
          {step === 1 && (
            <div className="grid min-w-0 gap-1">
              <label htmlFor={`${id}-goal`} className="sr-only">
                Título de la competencia
              </label>
              <input
                type="text"
                id={`${id}-goal`}
                aria-describedby={`${id}-goal-help`}
                required
                maxLength={100}
                className={`${fieldClass} min-h-11`}
                value={macro.goal}
                onChange={(event) => setMacro({ ...macro, goal: event.target.value })}
                placeholder="Ej. Campeonato Estatal de Natación"
              />
              <p id={`${id}-goal-help`} className="text-xs text-(--c-text-2)">
                Título de la competencia
              </p>
            </div>
          )}
          {step === 2 &&
            ([3, 4] as const).map((count) => (
              <div
                key={count}
                className={`grid rounded-2xl transition-colors ${template > 0 && template !== count ? 'gap-0 border px-3 py-1' : 'gap-2 border-2 p-3'} ${template === count ? 'border-(--c-aqua-strong) bg-(--c-surface) shadow-sm' : 'border-(--c-border) bg-white'}`}
              >
                <label
                  className={`flex min-h-11 gap-2 ${template > 0 && template !== count ? 'items-center text-xs' : 'items-start text-sm'}`}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm mt-0.5 shrink-0 border-2 border-slate-500 checked:border-primary checked:bg-primary checked:text-white"
                    aria-label={`Crear machote de ${count} mesociclos y ${count} microciclos por mesociclo`}
                    checked={template === count}
                    aria-describedby={`${id}-template-${count}-help`}
                    onChange={(event) => setTemplate(event.target.checked ? count : 0)}
                  />
                  <span className={template === count ? 'font-semibold text-(--c-ocean)' : ''}>
                    {template > 0 && template !== count
                      ? `Machote ${count} × ${count}`
                      : `Crear machote de ${count} mesociclos y ${count} microciclos por mesociclo`}
                  </span>
                </label>
                <p
                  hidden={template > 0 && template !== count}
                  id={`${id}-template-${count}-help`}
                  className="text-xs text-(--c-text-2)"
                >
                  {count === 3
                    ? 'Adaptación, Carga y Recuperación.'
                    : 'Adaptación, Carga, Recuperación y Enfoque.'}
                </p>
                <div
                  role="img"
                  hidden={template > 0 && template !== count}
                  aria-label={`Vista previa: ${count} mesociclos con ${count} microciclos cada uno`}
                  className="grid min-w-0 gap-2 py-2"
                >
                  <div aria-hidden="true" className="h-1.5 rounded-full bg-[#79b9cf]" />
                  <div
                    aria-hidden="true"
                    className="grid min-w-0 gap-2"
                    style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
                  >
                    {['Adaptación', 'Carga', 'Recuperación', 'Enfoque']
                      .slice(0, count)
                      .map((phase) => (
                        <div key={phase} className="grid min-w-0 gap-2">
                          <div className="h-1.5 rounded-full bg-(--c-aqua-strong)" />
                          <div
                            className="grid gap-1"
                            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
                          >
                            {['a', 'b', 'c', 'd'].slice(0, count).map((part) => (
                              <div key={part} className="h-1 rounded-full bg-[#258575]" />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
        </fieldset>
        {(validation || error) && (
          <p role="alert" className="text-sm text-rose-700">
            {validation || error}
          </p>
        )}
      </form>
    </Sheet>
  )
}
