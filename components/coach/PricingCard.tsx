'use client'
import { useEffect, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import ProfileSection from './ProfileSection'
import type { CoachPriceOption } from '@/firebase/coaches/coach.model'

interface PricingValue {
  priceOptions?: CoachPriceOption[]
}

function createPriceOption(): CoachPriceOption {
  return {
    id: crypto.randomUUID(),
    title: '',
    amount: null,
    currency: 'MXN',
    unit: 'clase',
    durationMinutes: 60,
    details: '',
  }
}

function getSummary(options: CoachPriceOption[]) {
  if (!options.length) return 'Aún no agregas precios'
  if (options.length === 1) return '1 opción de precio'
  return `${options.length} opciones de precio`
}

export default function PricingCard({
  value,
  saving,
  onSave,
}: {
  value: PricingValue
  saving: boolean
  onSave: (value: PricingValue) => void
}) {
  const [options, setOptions] = useState<CoachPriceOption[]>(
    value.priceOptions || []
  )

  useEffect(() => setOptions(value.priceOptions || []), [value.priceOptions])

  return (
    <ProfileSection
      title="Precios"
      description="Muestra cuánto cuestan tus clases de forma clara y fácil de comparar."
      summary={getSummary(options)}
    >
      {options.map((option, index) => (
        <article
          key={option.id}
          className="relative grid gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3 pr-12 sm:grid-cols-[minmax(0,1fr)_8rem_7rem] sm:p-4 sm:pr-14"
        >
          <button
            type="button"
            aria-label={`Quitar precio ${index + 1}`}
            className="btn btn-ghost btn-sm absolute right-2 top-2 text-[var(--c-error,#b91c1c)]"
            onClick={() =>
              setOptions((current) =>
                current.filter((item) => item.id !== option.id)
              )
            }
          >
            <FiTrash2 aria-hidden="true" />
          </button>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--c-ocean)]">
              Nombre
            </span>
            <input
              className="input input-bordered bg-white"
              placeholder="Ej. Clase individual"
              value={option.title}
              onChange={(event) =>
                setOptions((current) =>
                  current.map((item) =>
                    item.id === option.id
                      ? { ...item, title: event.target.value }
                      : item
                  )
                )
              }
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--c-ocean)]">
              Precio
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)]">
                $
              </span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className="input input-bordered w-full bg-white pl-7"
                placeholder="450"
                value={option.amount ?? ''}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((item) =>
                      item.id === option.id
                        ? {
                            ...item,
                            amount: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : item
                    )
                  )
                }
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[var(--c-ocean)]">
              Cobro
            </span>
            <select
              className="select select-bordered bg-white"
              value={option.unit}
              onChange={(event) =>
                setOptions((current) =>
                  current.map((item) =>
                    item.id === option.id
                      ? {
                          ...item,
                          unit: event.target.value as CoachPriceOption['unit'],
                        }
                      : item
                  )
                )
              }
            >
              <option value="clase">Por clase</option>
              <option value="sesión">Por sesión</option>
              <option value="mes">Por mes</option>
              <option value="paquete">Por paquete</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-1">
            <span className="text-sm font-semibold text-[var(--c-ocean)]">
              Duración
            </span>
            <div className="relative">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className="input input-bordered w-full bg-white pr-12"
                placeholder="60"
                value={option.durationMinutes ?? ''}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((item) =>
                      item.id === option.id
                        ? {
                            ...item,
                            durationMinutes: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : item
                    )
                  )
                }
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text-2)]">
                min
              </span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-[var(--c-ocean)]">
              Detalles
            </span>
            <input
              className="input input-bordered bg-white"
              placeholder="Ej. Incluye evaluación inicial"
              value={option.details || ''}
              onChange={(event) =>
                setOptions((current) =>
                  current.map((item) =>
                    item.id === option.id
                      ? { ...item, details: event.target.value }
                      : item
                  )
                )
              }
            />
          </label>
        </article>
      ))}

      <button
        type="button"
        className="btn btn-ghost self-start"
        onClick={() => setOptions((current) => [...current, createPriceOption()])}
      >
        <FiPlus /> Agregar precio
      </button>

      <div className="flex justify-end border-t border-[var(--c-border)] pt-5">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({ priceOptions: options })}
          className="btn btn-primary min-w-36 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar precios'}
        </button>
      </div>
    </ProfileSection>
  )
}
