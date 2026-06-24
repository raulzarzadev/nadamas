'use client'
import SaveButton from '@comps/SaveButton'
import { useEffect, useMemo, useState } from 'react'
import { FiClock, FiEdit2, FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi'
import type { CoachClassOffering, CoachOfferingSchedule } from '@/firebase/coaches/coach.model'
import { useAutosave } from '@/hooks/useAutosave'
import {
  createOffering,
  offeringContextLabel,
  offeringPrice,
  offeringPriceCents,
  resolveOfferingSchedules,
  resolveOfferings,
  scheduleIsOpen,
} from '@/lib/coach-offerings'
import AgendaOpenHoursModal, {
  type AgendaWeekDay,
  type OpenHoursDetails,
} from './AgendaOpenHoursModal'
import ProfileSection from './ProfileSection'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildNextWeekDays(): AgendaWeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return {
      key: dateKey(date),
      label: `${DAY_LABELS[date.getDay()]} ${date.getDate()}`,
    }
  })
}

function addMinutes(time: string, minutesToAdd: number) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const total = Math.min(hour * 60 + minute + minutesToAdd, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function dayLabelsFromDates(dates: string[]) {
  return [
    ...new Set(
      dates.map((date) => {
        const parsed = new Date(`${date}T12:00:00`)
        return DAY_LABELS[parsed.getDay()]
      })
    ),
  ]
}

function initialDatesForOffering(offering: CoachClassOffering) {
  return [
    ...new Set(
      resolveOfferingSchedules(offering).flatMap((schedule) => schedule.availableDates || [])
    ),
  ].sort()
}

function initialTimesForOffering(offering: CoachClassOffering) {
  return [
    ...new Set(
      resolveOfferingSchedules(offering)
        .filter((schedule) => !scheduleIsOpen(schedule) && schedule.startTime)
        .map((schedule) => schedule.startTime)
    ),
  ].sort()
}

export default function OfferingsCard({
  value,
  saving,
  onSave,
}: {
  uid: string
  value: {
    classOfferings?: CoachClassOffering[]
    teachingLocations?: import('@/firebase/coaches/coach.model').CoachTeachingLocation[]
    priceOptions?: import('@/firebase/coaches/coach.model').CoachPriceOption[]
  }
  saving: boolean
  onSave: (v: { classOfferings: CoachClassOffering[] }) => void
}) {
  const initial = useMemo(
    () =>
      resolveOfferings({
        classOfferings: value.classOfferings,
        teachingLocations: value.teachingLocations,
        priceOptions: value.priceOptions,
      }),
    [value.classOfferings, value.teachingLocations, value.priceOptions]
  )
  const [offerings, setOfferings] = useState<CoachClassOffering[]>(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [error] = useState<string | null>(null)

  const editing = offerings.find((offering) => offering.id === editingId) || null
  const weekDays = useMemo(() => buildNextWeekDays(), [])

  useEffect(() => {
    if (!editingId) setOfferings(initial)
  }, [initial, editingId])

  const { status: autoStatus, saveNow } = useAutosave(
    JSON.stringify(offerings),
    () => onSave({ classOfferings: offerings }),
    { enabled: !editingId }
  )

  function startAdd() {
    setScheduleModalOpen(true)
  }

  function schedulesFromSelection(
    dates: string[],
    times: string[],
    durationMinutes: number
  ): CoachOfferingSchedule[] {
    const days = dayLabelsFromDates(dates)
    return times.map((time) => ({
      id: crypto.randomUUID(),
      timeMode: 'fixed',
      days,
      startTime: time,
      endTime: addMinutes(time, durationMinutes),
      availabilityMode: 'dates',
      availableDates: dates,
    }))
  }

  function addSchedulesFromModal(dates: string[], times: string[], details?: OpenHoursDetails) {
    if (dates.length === 0 || times.length === 0) return

    const next = createOffering()
    next.details = details?.title || ''
    next.placeName = details?.placeName || ''
    next.priceCents = details?.priceCents ?? null
    next.schedules = schedulesFromSelection(dates, times, next.durationMinutes ?? 60)
    setOfferings((current) => [...current, next])

    setScheduleModalOpen(false)
  }

  function updateOfferingFromModal(dates: string[], times: string[], details?: OpenHoursDetails) {
    if (!editing || dates.length === 0 || times.length === 0) return

    const nextOfferings = offerings.map((offering) =>
      offering.id === editing.id
        ? {
            ...offering,
            details: details?.title ?? offering.details,
            placeName: details?.placeName ?? offering.placeName,
            priceCents: details?.priceCents ?? offering.priceCents,
            schedules: schedulesFromSelection(dates, times, offering.durationMinutes ?? 60),
          }
        : offering
    )

    setOfferings(nextOfferings)
    setEditingId(null)
    onSave({ classOfferings: nextOfferings })
  }

  return (
    <ProfileSection
      id="coach-offerings"
      title="Lugares, horarios y precios"
      description="Cada clase que ofreces: dónde la das, qué días y horario, y cuánto cuesta. Puedes tener una en un lugar fijo y otra a domicilio con precio distinto."
      summary={`${offerings.length} ${offerings.length === 1 ? 'clase' : 'clases'}`}
    >
      {error && <p className="text-sm text-[var(--cc-error,#b91c1c)]">{error}</p>}

      {offerings.length === 0 && (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-8 text-center text-sm text-[var(--c-text-2)]">
          Aún no agregas clases. Empieza con la primera.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {offerings.map((offering) => (
          <OfferingScheduleCard
            key={offering.id}
            offering={offering}
            onEdit={() => {
              setEditingId(offering.id)
            }}
            onRemove={() =>
              setOfferings((current) => current.filter((item) => item.id !== offering.id))
            }
          />
        ))}
      </div>

      <button type="button" className="btn btn-ghost self-start" onClick={startAdd}>
        <FiPlus /> Abrir horarios
      </button>

      {scheduleModalOpen && (
        <AgendaOpenHoursModal
          weekDays={weekDays}
          defaultDate={weekDays[0]?.key}
          busy={false}
          showDetails
          onClose={() => setScheduleModalOpen(false)}
          onSubmit={addSchedulesFromModal}
        />
      )}

      {editing && (
        <AgendaOpenHoursModal
          weekDays={weekDays}
          title="Editar horario"
          description="Ajusta los días, horas y datos de esta clase."
          submitLabel="Guardar cambios"
          defaultDate={initialDatesForOffering(editing)[0] || weekDays[0]?.key}
          initialDates={initialDatesForOffering(editing)}
          initialTimes={initialTimesForOffering(editing)}
          initialDetails={{
            title: editing.details || '',
            placeName: editing.placeName || '',
            priceCents: offeringPriceCents(editing),
          }}
          busy={false}
          showDetails
          onClose={() => setEditingId(null)}
          onSubmit={updateOfferingFromModal}
        />
      )}

      <div className="flex justify-end border-t border-[var(--c-border)] pt-5">
        <SaveButton
          status={saving ? 'saving' : autoStatus}
          onClick={saveNow}
          disabled={!!editingId}
          idleLabel="Guardado"
          savedLabel="Guardado"
        />
      </div>
    </ProfileSection>
  )
}

function OfferingScheduleCard({
  offering,
  onEdit,
  onRemove,
}: {
  offering: CoachClassOffering
  onEdit: () => void
  onRemove: () => void
}) {
  const schedules = resolveOfferingSchedules(offering)
  const fixedSchedules = schedules.filter((schedule) => !scheduleIsOpen(schedule))
  const days = [
    ...new Set(
      fixedSchedules.flatMap((schedule) =>
        schedule.days.length
          ? schedule.days
          : (schedule.availableDates || []).map(
              (date) => DAY_LABELS[new Date(`${date}T12:00:00`).getDay()]
            )
      )
    ),
  ].filter(Boolean)
  const sortedSchedules = [...fixedSchedules].sort((a, b) =>
    `${a.startTime || ''}${a.endTime || ''}`.localeCompare(`${b.startTime || ''}${b.endTime || ''}`)
  )

  return (
    <article className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[0_1px_0_rgba(10,37,64,0.04)]">
      <div className="flex flex-col gap-3 border-b border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center rounded-full bg-white px-3 text-sm font-extrabold text-[var(--c-ocean)] ring-1 ring-[var(--c-border)]">
              {offering.groupType === 'grupal' ? 'Grupal' : 'Particular'}
            </span>
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold text-[var(--c-text-2)] ring-1 ring-[var(--c-border)]">
              <FiClock aria-hidden="true" /> {offering.durationMinutes ?? 60} min
            </span>
          </div>
          <h3 className="mt-3 break-words text-lg font-extrabold leading-tight text-[var(--c-ocean)]">
            {offeringContextLabel(offering)}
          </h3>
          {offering.details && (
            <p className="mt-1 break-words text-sm font-semibold text-[var(--c-ocean-mid)]">
              {offering.details}
            </p>
          )}
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-text-2)]">
            <FiMapPin aria-hidden="true" className="shrink-0" />
            <span>
              {offering.mode === 'home'
                ? 'A domicilio'
                : offering.mode === 'online'
                  ? 'En línea'
                  : 'Lugar fijo'}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
          <p className="text-lg font-extrabold leading-tight text-[var(--c-ocean)]">
            {offeringPrice(offering)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Editar clase"
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--c-border)] bg-white text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua)]"
              onClick={onEdit}
            >
              <FiEdit2 aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Quitar clase"
              className="grid h-10 w-10 place-items-center rounded-full border border-red-200 bg-white text-red-500 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              onClick={onRemove}
            >
              <FiTrash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {days.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DAY_LABELS.slice(1)
              .concat(DAY_LABELS[0])
              .map((day) => {
                const active = days.includes(day)
                return (
                  <span
                    key={day}
                    className={`inline-flex h-8 min-w-10 items-center justify-center rounded-full border px-2 text-xs font-bold ${
                      active
                        ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                        : 'border-[var(--c-border)] bg-white text-[var(--c-text-2)]'
                    }`}
                  >
                    {day}
                  </span>
                )
              })}
          </div>
        )}

        <div className="overflow-hidden rounded-[var(--r-sm)] border border-[var(--c-border)]">
          {sortedSchedules.length > 0 ? (
            sortedSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center gap-3 border-b border-[var(--c-border)] px-3 py-3 last:border-b-0"
              >
                <span className="w-24 shrink-0 text-sm font-bold text-[var(--c-text-2)]">
                  {schedule.startTime || '--:--'}-{schedule.endTime || '--:--'}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--r-sm)] border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm font-bold text-[var(--c-ocean)]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                    aria-hidden="true"
                  />
                  <span className="truncate">Disponible</span>
                </span>
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-[var(--c-text-2)]">
              Horario abierto. Los alumnos te contactan para acordar la hora.
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
