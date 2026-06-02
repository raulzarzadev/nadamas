'use client'
import { DateField, MoneyField, SelectField, TextField, TimeField } from '@comps/Inputs/FormFields'
import ImageInput from '@comps/Inputs/ImageInput'
import SaveButton from '@comps/SaveButton'
import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import type { CoachClassOffering, CoachGalleryPhoto } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { useAutosave } from '@/hooks/useAutosave'
import {
  createOffering,
  createOfferingSchedule,
  OFFERING_DAYS,
  OFFERING_UNITS,
  offeringHeadline,
  offeringPrice,
  offeringPriceCents,
  offeringWhen,
  resolveOfferingSchedules,
  resolveOfferings,
  scheduleIsOpen,
} from '@/lib/coach-offerings'
import { optimizeImageForUpload } from '@/lib/image-optimizer'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import OfferingSummaryCard from './OfferingSummaryCard'
import ProfileSection from './ProfileSection'

export default function OfferingsCard({
  uid,
  value,
  saving,
  onSave,
}: {
  uid: string
  value: {
    classOfferings?: CoachClassOffering[]
    teachingLocations?: import('@/firebase/coaches/coach.model').CoachTeachingLocation[]
    priceOptions?: import('@/firebase/coaches/coach.model').CoachPriceOption[]
    galleryPhotos?: CoachGalleryPhoto[]
  }
  saving: boolean
  onSave: (v: { classOfferings: CoachClassOffering[]; galleryPhotos?: CoachGalleryPhoto[] }) => void
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
  const [galleryPhotos, setGalleryPhotos] = useState<CoachGalleryPhoto[]>(value.galleryPhotos || [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [scheduleModal, setScheduleModal] = useState<
    import('@/firebase/coaches/coach.model').CoachOfferingSchedule | null
  >(null)
  const [busyImage, setBusyImage] = useState(false)
  const [imageProgress, setImageProgress] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [splitOnSave, setSplitOnSave] = useState(true)

  const editing = offerings.find((offering) => offering.id === editingId) || null

  useEffect(() => {
    if (!editingId) setOfferings(initial)
  }, [initial, editingId])
  useEffect(() => setGalleryPhotos(value.galleryPhotos || []), [value.galleryPhotos])
  useEffect(() => {
    if (scheduleModal) setSplitOnSave(true)
  }, [scheduleModal])

  const { status: autoStatus, saveNow } = useAutosave(
    JSON.stringify({ offerings, galleryPhotos }),
    () => onSave({ classOfferings: offerings, galleryPhotos }),
    { enabled: !editingId }
  )

  function patchEditing(patch: Partial<CoachClassOffering>) {
    setOfferings((current) =>
      current.map((offering) => (offering.id === editingId ? { ...offering, ...patch } : offering))
    )
  }

  function splitScheduleIntoSlots(
    schedule: import('@/firebase/coaches/coach.model').CoachOfferingSchedule,
    durationMinutes: number
  ): import('@/firebase/coaches/coach.model').CoachOfferingSchedule[] {
    const [startH, startM] = schedule.startTime.split(':').map(Number)
    const [endH, endM] = schedule.endTime.split(':').map(Number)
    const startTotal = startH * 60 + startM
    const endTotal = endH * 60 + endM
    if (endTotal <= startTotal + durationMinutes) return [schedule]
    const slots: import('@/firebase/coaches/coach.model').CoachOfferingSchedule[] = []
    for (let t = startTotal; t + durationMinutes <= endTotal; t += durationMinutes) {
      const fmt = (mins: number) =>
        `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
      slots.push({
        ...schedule,
        id: crypto.randomUUID(),
        startTime: fmt(t),
        endTime: fmt(t + durationMinutes),
      })
    }
    return slots
  }

  function closeStepper() {
    setEditingId(null)
    setStep(1)
    setError(null)
  }

  function cancelStepper() {
    setOfferings((current) =>
      current.filter(
        (offering) =>
          offering.id !== editingId ||
          offering.placeName?.trim() ||
          offering.coverageArea?.trim() ||
          resolveOfferingSchedules(offering).some(
            (schedule) => scheduleIsOpen(schedule) || schedule.days.length > 0
          )
      )
    )
    closeStepper()
  }

  function stepValid(currentStep: number, offering: CoachClassOffering) {
    // Steps 1 (Qué) and 2 (Cuánto) are always valid
    if (currentStep === 3)
      return offering.mode === 'home'
        ? !!offering.coverageArea?.trim()
        : offering.mode === 'online'
          ? true
          : !!offering.placeName?.trim()
    if (currentStep === 4)
      return resolveOfferingSchedules(offering).some(
        (schedule) =>
          scheduleIsOpen(schedule) ||
          (schedule.days.length > 0 && !!schedule.startTime && !!schedule.endTime)
      )
    return true
  }

  function stepSummary(s: number, offering: CoachClassOffering): string {
    if (s === 1) {
      const base = offering.groupType === 'grupal' ? '👥 Grupal' : '👤 Particular'
      const cap =
        offering.groupType === 'grupal' && offering.maxPeople ? ` · máx ${offering.maxPeople}` : ''
      return `${base}${cap} · ${offering.durationMinutes ?? 60} min`
    }
    if (s === 2) return offeringPrice(offering) || 'Sin precio'
    if (s === 3) {
      if (offering.mode === 'home') return `🏠 ${offering.coverageArea || 'A domicilio'}`
      if (offering.mode === 'online') return '💻 En línea'
      return `📍 ${offering.placeName || 'Lugar fijo'}`
    }
    return ''
  }

  async function uploadImage(file: File) {
    if (!editingId) return
    setError(null)
    setBusyImage(true)
    let finished = false
    let fileToUpload = file

    try {
      fileToUpload = (await optimizeImageForUpload(file)).file
    } catch (uploadError) {
      reportInternalError('OFFERING_IMAGE_PREPARE', uploadError)
      setError(GENERIC_USER_ERROR)
      setBusyImage(false)
      return
    }

    CoachCRUD.uploadAsset({ file: fileToUpload, uid, scope: 'public' }, (progress, url) => {
      if (typeof progress === 'number') setImageProgress(progress)
      if (!url || finished) return
      finished = true
      patchEditing({ imageUrl: url })
      setGalleryPhotos((current) => [...current, { url, label: 'Lugares de trabajo' }])
      setImageProgress(undefined)
      setBusyImage(false)
    })

    setTimeout(() => {
      if (finished) return
      finished = true
      setError('No se pudo subir la imagen del lugar.')
      setImageProgress(undefined)
      setBusyImage(false)
    }, 30000)
  }

  function startAdd() {
    const next = createOffering()
    setOfferings((current) => [...current, next])
    setStep(1)
    setEditingId(next.id)
  }

  if (editing) {
    return (
      <>
        <ProfileSection
          title="Lugares, horarios y precios"
          description="Cada clase que ofreces: dónde, cuándo y cuánto cuesta."
          summary={`Editando · paso ${step} de 4`}
        >
          {/* Stepper */}
          <div className="flex items-center">
            {(['Qué', 'Cuánto', 'Dónde', 'Cuándo'] as const).map((label, i) => {
              const s = i + 1
              const isDone = s < step
              const isActive = s === step
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                        isDone
                          ? 'bg-[var(--c-aqua)] text-white'
                          : isActive
                            ? 'bg-[var(--c-ocean)] text-white'
                            : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
                      }`}
                    >
                      {isDone ? '✓' : s}
                    </div>
                    <span
                      className={`text-xs ${
                        isActive ? 'font-semibold text-[var(--c-ocean)]' : 'text-[var(--c-text-2)]'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className={`mb-5 h-px w-10 ${
                        s < step ? 'bg-[var(--c-aqua)]' : 'bg-[var(--c-border)]'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

          {/* Breadcrumb: resumen de pasos anteriores */}
          {step > 1 && (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: step - 1 }, (_, i) => i + 1).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1.5 text-sm text-[var(--c-ocean)] hover:bg-[var(--c-bg)]"
                >
                  <span className="text-xs text-[var(--c-text-2)]">
                    {(['Qué', 'Cuánto', 'Dónde', 'Cuándo'] as const)[s - 1]}
                  </span>
                  <span className="text-[var(--c-border)]" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-semibold">{stepSummary(s, editing)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Paso 1 — Qué */}
          {step === 1 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {(['particular', 'grupal'] as const).map((groupType) => (
                  <button
                    key={groupType}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      editing.groupType === groupType
                        ? 'bg-[var(--c-ocean)] text-white'
                        : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                    }`}
                    onClick={() => patchEditing({ groupType })}
                  >
                    {groupType === 'particular' ? '👤 Particular' : '👥 Grupal'}
                  </button>
                ))}
              </div>

              {editing.groupType === 'grupal' && (
                <TextField
                  label="Cupo máximo (opcional)"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  className="w-32"
                  placeholder="8"
                  value={editing.maxPeople ?? ''}
                  onChange={(event) =>
                    patchEditing({
                      maxPeople: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
              )}

              <SelectField
                label="Duración del módulo"
                value={String(editing.durationMinutes ?? 60)}
                onChange={(event) => patchEditing({ durationMinutes: Number(event.target.value) })}
              >
                {[30, 45, 60, 90, 120].map((min) => (
                  <option key={min} value={min}>
                    {min} min
                  </option>
                ))}
              </SelectField>
            </div>
          )}

          {/* Paso 2 — Cuánto */}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <MoneyField
                  label="Precio"
                  valueCents={offeringPriceCents(editing)}
                  onChange={(priceCents) => patchEditing({ priceCents })}
                />
                <SelectField
                  label="Cobro"
                  value={editing.unit}
                  onChange={(event) =>
                    patchEditing({ unit: event.target.value as CoachClassOffering['unit'] })
                  }
                >
                  {OFFERING_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </SelectField>
              </div>
              <TextField
                label="Detalles (opcional)"
                placeholder="Ej. Incluye evaluación inicial"
                value={editing.details || ''}
                onChange={(event) => patchEditing({ details: event.target.value })}
              />
            </div>
          )}

          {/* Paso 3 — Dónde */}
          {step === 3 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {(['fixed', 'home', 'online'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      editing.mode === mode
                        ? 'bg-[var(--c-ocean)] text-white'
                        : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                    }`}
                    onClick={() => patchEditing({ mode })}
                  >
                    {mode === 'fixed'
                      ? '📍 Lugar fijo'
                      : mode === 'home'
                        ? '🏠 A domicilio'
                        : '💻 En línea'}
                  </button>
                ))}
              </div>

              {editing.mode === 'fixed' ? (
                <>
                  <TextField
                    label="Nombre del lugar"
                    placeholder="Ej. Alberca El Coromuel"
                    value={editing.placeName || ''}
                    onChange={(event) => patchEditing({ placeName: event.target.value })}
                  />
                  <details className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--c-text-2)]">
                      Más opciones (opcional)
                    </summary>
                    <div className="mt-3 flex flex-col gap-3">
                      <TextField
                        label="Link de Google Maps"
                        hideLabel
                        placeholder="Link de Google Maps"
                        value={editing.locationUrl || ''}
                        onChange={(event) => patchEditing({ locationUrl: event.target.value })}
                      />
                      <ImageInput
                        label="Foto del lugar"
                        imageUrl={editing.imageUrl}
                        imageAlt={editing.placeName || 'Lugar de clases'}
                        busy={busyImage}
                        progress={imageProgress}
                        helperText="También se agrega a tu galería como “Lugares de trabajo”."
                        onFileSelected={(file) => uploadImage(file)}
                      />
                    </div>
                  </details>
                </>
              ) : editing.mode === 'home' ? (
                <TextField
                  label="Zona / colonias que cubro"
                  placeholder="Ej. Centro y Fovissste, La Paz"
                  value={editing.coverageArea || ''}
                  onChange={(event) => patchEditing({ coverageArea: event.target.value })}
                />
              ) : (
                <TextField
                  label="Detalles de la clase en línea (opcional)"
                  placeholder="Ej. Zoom · te envío el enlace al reservar"
                  value={editing.onlineDetails || ''}
                  onChange={(event) => patchEditing({ onlineDetails: event.target.value })}
                />
              )}
            </div>
          )}

          {/* Paso 4 — Cuándo */}
          {step === 4 && (
            <div className="flex flex-col gap-3">
              {resolveOfferingSchedules(editing).length > 0 && (
                <div className="flex flex-col gap-2">
                  {resolveOfferingSchedules(editing).map((schedule, scheduleIndex) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--c-ocean)]">
                          Horario {scheduleIndex + 1}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--c-text-2)]">
                          {scheduleIsOpen(schedule)
                            ? 'Horario abierto'
                            : schedule.days.length
                              ? `${schedule.days.join(' · ')} · ${schedule.startTime}–${schedule.endTime}`
                              : 'Sin días configurados'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label="Editar horario"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setScheduleModal({ ...schedule })}
                        >
                          <FiEdit2 aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Quitar horario"
                          className="btn btn-ghost btn-sm text-[var(--c-error,#b91c1c)]"
                          disabled={resolveOfferingSchedules(editing).length <= 1}
                          onClick={() =>
                            patchEditing({
                              schedules: resolveOfferingSchedules(editing).filter(
                                (item) => item.id !== schedule.id
                              ),
                            })
                          }
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn btn-ghost self-start"
                onClick={() => setScheduleModal(createOfferingSchedule())}
              >
                <FiPlus /> Agregar horario
              </button>

              {resolveOfferingSchedules(editing).some(
                (s) => !scheduleIsOpen(s) && s.days.length > 0 && !!s.startTime && !!s.endTime
              ) && (
                <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-bg)] p-4">
                  <p className="font-semibold text-[var(--c-ocean)]">{offeringHeadline(editing)}</p>
                  <p className="mt-1 text-sm text-[var(--c-text-2)]">{offeringWhen(editing)}</p>
                  <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                    {offeringPrice(editing)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-5">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={step === 1 ? cancelStepper : () => setStep((current) => current - 1)}
            >
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>
            {step < 4 ? (
              <button
                type="button"
                className="btn bg-[var(--c-aqua)] text-white hover:bg-[var(--c-aqua-strong)]"
                disabled={!stepValid(step, editing)}
                onClick={() => setStep((current) => current + 1)}
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                className="btn bg-[var(--c-aqua)] text-white hover:bg-[var(--c-aqua-strong)]"
                disabled={!stepValid(step, editing)}
                onClick={() => {
                  closeStepper()
                  saveNow()
                }}
              >
                Guardar clase
              </button>
            )}
          </div>
        </ProfileSection>

        {scheduleModal && editing && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Configurar horario"
            className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm sm:items-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setScheduleModal(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setScheduleModal(null)
            }}
          >
            <div className="flex w-full max-w-lg flex-col gap-4 rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)]">
              <h3 className="text-base font-bold text-[var(--c-ocean-mid)]">Configurar horario</h3>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[var(--c-text-2)]">
                  Tipo de horario
                </span>
                <div className="flex gap-2">
                  {(
                    [
                      ['fixed', 'Horario fijo'],
                      ['open', 'Horario abierto'],
                    ] as const
                  ).map(([timeMode, label]) => {
                    const isActive = (scheduleModal.timeMode ?? 'fixed') === timeMode
                    return (
                      <button
                        key={timeMode}
                        type="button"
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${isActive ? 'bg-[var(--c-ocean)] text-white' : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'}`}
                        onClick={() => setScheduleModal((s) => s && { ...s, timeMode })}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {scheduleIsOpen(scheduleModal) ? (
                <div className="rounded-[var(--r-sm)] border border-dashed border-[var(--c-border)] bg-[var(--c-bg)] p-3 text-sm text-[var(--c-text-2)]">
                  Publica esta clase como horario abierto para acordar día y hora con cada alumno.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-[var(--c-text-2)]">
                      Fechas disponibles
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['always', 'Siempre'],
                          ['next_week', 'Solo próxima semana'],
                          ['dates', 'Solo algunas fechas'],
                        ] as const
                      ).map(([mode, label]) => {
                        const isActive = (scheduleModal.availabilityMode ?? 'always') === mode
                        return (
                          <button
                            key={mode}
                            type="button"
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${isActive ? 'bg-[var(--c-ocean)] text-white' : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'}`}
                            onClick={() =>
                              setScheduleModal((s) => s && { ...s, availabilityMode: mode })
                            }
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    {(scheduleModal.availabilityMode ?? 'always') === 'dates' && (
                      <div className="grid gap-3 sm:grid-cols-[16rem_1fr] sm:items-end">
                        <DateField
                          label={`Agregar fecha · ${(scheduleModal.availableDates || []).length} ${(scheduleModal.availableDates || []).length === 1 ? 'fecha' : 'fechas'}`}
                          onChange={(event) => {
                            if (!event.target.value) return
                            setScheduleModal(
                              (s) =>
                                s && {
                                  ...s,
                                  availableDates: [
                                    ...new Set([...(s.availableDates || []), event.target.value]),
                                  ].sort(),
                                }
                            )
                            event.target.value = ''
                          }}
                        />
                        <div className="flex min-h-10 flex-wrap gap-2">
                          {(scheduleModal.availableDates || []).length === 0 && (
                            <span className="text-sm text-[var(--c-text-2)]">Sin fechas aún.</span>
                          )}
                          {(scheduleModal.availableDates || []).map((d) => (
                            <button
                              key={d}
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1 text-sm font-semibold text-[var(--c-ocean)]"
                              onClick={() =>
                                setScheduleModal(
                                  (s) =>
                                    s && {
                                      ...s,
                                      availableDates: (s.availableDates || []).filter(
                                        (x) => x !== d
                                      ),
                                    }
                                )
                              }
                            >
                              {new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                              })}
                              <span aria-hidden="true">×</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-[var(--c-text-2)]">Días</span>
                    <div className="flex flex-wrap gap-2">
                      {OFFERING_DAYS.map((day) => {
                        const isSelected = scheduleModal.days.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${isSelected ? 'bg-[var(--c-ocean)] text-white' : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'}`}
                            onClick={() =>
                              setScheduleModal(
                                (s) =>
                                  s && {
                                    ...s,
                                    days: isSelected
                                      ? s.days.filter((d) => d !== day)
                                      : [...s.days, day],
                                  }
                              )
                            }
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <TimeField
                      label="Desde"
                      value={scheduleModal.startTime}
                      onChange={(e) =>
                        setScheduleModal((s) => s && { ...s, startTime: e.target.value })
                      }
                    />
                    <TimeField
                      label="Hasta"
                      value={scheduleModal.endTime}
                      onChange={(e) =>
                        setScheduleModal((s) => s && { ...s, endTime: e.target.value })
                      }
                    />
                  </div>

                  {(() => {
                    const dur = editing.durationMinutes ?? 60
                    const [sh, sm] = scheduleModal.startTime.split(':').map(Number)
                    const [eh, em] = scheduleModal.endTime.split(':').map(Number)
                    const count = Math.floor((eh * 60 + em - (sh * 60 + sm)) / dur)
                    if (count <= 1) return null
                    return (
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={splitOnSave}
                          onChange={(e) => setSplitOnSave(e.target.checked)}
                        />
                        <span className="text-sm text-[var(--c-ocean)]">
                          Dividir en {count} tramos de {dur} min
                        </span>
                      </label>
                    )
                  })()}
                </>
              )}

              <div className="flex justify-end gap-3 border-t border-[var(--c-border)] pt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setScheduleModal(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn bg-[var(--c-aqua)] text-white hover:bg-[var(--c-aqua-strong)]"
                  onClick={() => {
                    const dur = editing.durationMinutes ?? 60
                    const [sh, sm] = scheduleModal.startTime.split(':').map(Number)
                    const [eh, em] = scheduleModal.endTime.split(':').map(Number)
                    const count = Math.floor((eh * 60 + em - (sh * 60 + sm)) / dur)
                    const shouldSplit = splitOnSave && count > 1
                    const schedulesToAdd = shouldSplit
                      ? splitScheduleIntoSlots(scheduleModal, dur)
                      : [scheduleModal]
                    const isNew = !resolveOfferingSchedules(editing).some(
                      (s) => s.id === scheduleModal.id
                    )
                    patchEditing({
                      schedules: isNew
                        ? [...resolveOfferingSchedules(editing), ...schedulesToAdd]
                        : [
                            ...resolveOfferingSchedules(editing).filter(
                              (s) => s.id !== scheduleModal.id
                            ),
                            ...schedulesToAdd,
                          ],
                    })
                    setScheduleModal(null)
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
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
          <OfferingSummaryCard
            key={offering.id}
            offering={offering}
            actions={
              <>
                <button
                  type="button"
                  aria-label="Editar clase"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setStep(1)
                    setEditingId(offering.id)
                  }}
                >
                  <FiEdit2 aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Quitar clase"
                  className="btn btn-ghost btn-sm text-[var(--c-error,#b91c1c)]"
                  onClick={() =>
                    setOfferings((current) => current.filter((item) => item.id !== offering.id))
                  }
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </>
            }
          />
        ))}
      </div>

      <button type="button" className="btn btn-ghost self-start" onClick={startAdd}>
        <FiPlus /> Agregar clase
      </button>

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
