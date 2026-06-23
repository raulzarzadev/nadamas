'use client'

import { TimeField } from '@comps/Inputs/FormFields'
import type { CoachClassOffering, CoachPublic } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { OFFERING_DAYS } from '@/lib/coach-offerings'

/**
 * @deprecated Replaced by AgendaOpenHoursModal-based setup in CoachProfileGate.
 * Kept as a reference for the previous inline first-schedule form.
 */
export default function DeprecatedCoachScheduleSetup({
  uid,
  pub,
  placeName,
  setPlaceName,
  selectedDays,
  setSelectedDays,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  price,
  setPrice,
  savingSchedule,
  setSavingSchedule,
  scheduleMessage,
  setScheduleMessage,
}: {
  uid: string
  pub: CoachPublic | null
  placeName: string
  setPlaceName: (value: string) => void
  selectedDays: string[]
  setSelectedDays: (value: string[] | ((current: string[]) => string[])) => void
  startTime: string
  setStartTime: (value: string) => void
  endTime: string
  setEndTime: (value: string) => void
  price: string
  setPrice: (value: string) => void
  savingSchedule: boolean
  setSavingSchedule: (value: boolean) => void
  scheduleMessage: string | null
  setScheduleMessage: (value: string | null) => void
}) {
  const canSaveSchedule =
    placeName.trim().length > 0 &&
    selectedDays.length > 0 &&
    startTime.length > 0 &&
    endTime.length > 0 &&
    startTime < endTime &&
    !savingSchedule

  async function saveSchedule() {
    if (!canSaveSchedule) return

    setSavingSchedule(true)
    setScheduleMessage(null)

    const priceNumber = Number(price)
    const offering: CoachClassOffering = {
      id: crypto.randomUUID(),
      mode: 'fixed',
      placeName: placeName.trim(),
      locationUrl: '',
      coverageArea: '',
      onlineDetails: '',
      groupType: 'particular',
      maxPeople: null,
      schedules: [
        {
          id: crypto.randomUUID(),
          timeMode: 'fixed',
          days: selectedDays,
          startTime,
          endTime,
          availabilityMode: 'always',
          availableDates: [],
        },
      ],
      durationMinutes: 60,
      priceCents:
        Number.isFinite(priceNumber) && priceNumber > 0 ? Math.round(priceNumber * 100) : null,
      currency: 'MXN',
      unit: 'clase',
      details: '',
    }

    try {
      await CoachCRUD.upsertPublic(uid, {
        classOfferings: [...(pub?.classOfferings || []), offering],
      })
      setScheduleMessage('Horario guardado.')
      setPlaceName('')
      setSelectedDays([])
      setStartTime('06:00')
      setEndTime('07:00')
      setPrice('')
    } catch (_error) {
      setScheduleMessage('Ups, algo salió mal. Inténtalo de nuevo más tarde.')
    } finally {
      setSavingSchedule(false)
    }
  }

  return (
    <section
      aria-labelledby="quick-schedule-title"
      className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h2 id="quick-schedule-title" className="text-xl font-extrabold text-[var(--c-ocean)]">
          Configura tu primer horario
        </h2>
        <p className="text-sm text-[var(--c-text-2)]">
          Agrega un lugar, días y hora para desbloquear esta parte de tu perfil.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--c-ocean)]">Lugar de clase</span>
          <input
            type="text"
            value={placeName}
            onChange={(event) => setPlaceName(event.target.value)}
            placeholder="Ej. Alberca Olímpica"
            className="h-12 rounded-2xl border border-[var(--c-border)] bg-white px-4 font-semibold text-[var(--c-ocean)] outline-none transition placeholder:text-[rgba(75,85,99,0.68)] focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--c-aqua)_18%,transparent)]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--c-ocean)]">Precio por clase</span>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Opcional"
            className="h-12 rounded-2xl border border-[var(--c-border)] bg-white px-4 font-semibold text-[var(--c-ocean)] outline-none transition placeholder:text-[rgba(75,85,99,0.68)] focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--c-aqua)_18%,transparent)]"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <span className="text-sm font-semibold text-[var(--c-ocean)]">Días disponibles</span>
        <div className="flex flex-wrap gap-2">
          {OFFERING_DAYS.map((day) => {
            const isSelected = selectedDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={isSelected}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--c-aqua)_22%,transparent)] ${
                  isSelected
                    ? 'bg-[var(--c-ocean)] text-white'
                    : 'bg-[var(--c-surface)] text-[var(--c-ocean)] hover:bg-[color-mix(in_srgb,var(--c-aqua)_16%,white)]'
                }`}
                onClick={() =>
                  setSelectedDays((current) =>
                    isSelected ? current.filter((item) => item !== day) : [...current, day]
                  )
                }
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <TimeField
          label="Desde"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        />
        <TimeField
          label="Hasta"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
        />
      </div>

      {startTime >= endTime && (
        <p className="mt-3 text-sm font-semibold text-[var(--cc-error,#b91c1c)]">
          La hora final debe ser después de la hora inicial.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canSaveSchedule}
          onClick={saveSchedule}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--c-aqua)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--c-aqua)_28%,transparent)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {savingSchedule ? 'Guardando...' : 'Guardar horario'}
        </button>
        {scheduleMessage && (
          <p className="text-sm font-semibold text-[var(--c-text-2)]">{scheduleMessage}</p>
        )}
      </div>
    </section>
  )
}
