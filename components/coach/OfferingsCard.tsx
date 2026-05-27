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
  const [busyImage, setBusyImage] = useState(false)
  const [imageProgress, setImageProgress] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const editing = offerings.find((offering) => offering.id === editingId) || null

  useEffect(() => setOfferings(initial), [initial])
  useEffect(() => setGalleryPhotos(value.galleryPhotos || []), [value.galleryPhotos])

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
    if (currentStep === 1)
      return offering.mode === 'home'
        ? !!offering.coverageArea?.trim()
        : offering.mode === 'online'
          ? true
          : !!offering.placeName?.trim()
    if (currentStep === 2)
      return resolveOfferingSchedules(offering).some(
        (schedule) =>
          scheduleIsOpen(schedule) ||
          (schedule.days.length > 0 && !!schedule.startTime && !!schedule.endTime)
      )
    return true
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
      <ProfileSection
        title="Lugares, horarios y precios"
        description="Cada clase que ofreces: dónde, cuándo y cuánto cuesta."
        summary={`Editando · paso ${step} de 3`}
      >
        {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

        <div className="flex gap-2 text-xs font-semibold">
          {['Dónde', 'Qué y cuándo', 'Cuánto'].map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={
                index + 1 > step &&
                Array.from({ length: index }, (_, currentIndex) => currentIndex + 1).some(
                  (currentStep) => !stepValid(currentStep, editing)
                )
              }
              onClick={() => setStep(index + 1)}
              className={`rounded-full px-3 py-1 ${
                step === index + 1
                  ? 'bg-[var(--c-ocean)] text-white'
                  : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
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

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
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
                  {groupType === 'particular' ? 'Particular' : '👥 Grupal'}
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

            {resolveOfferingSchedules(editing).map((schedule, scheduleIndex) => (
              <div
                key={schedule.id}
                className="flex flex-col gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--c-ocean)]">
                    Horario {scheduleIndex + 1}
                  </p>
                  {resolveOfferingSchedules(editing).length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-[var(--c-error,#b91c1c)]"
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
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--c-text-2)]">
                    Tipo de horario
                  </span>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                    {[
                      ['fixed', 'Horario fijo'],
                      ['open', 'Horario abierto'],
                    ].map(([timeMode, label]) => {
                      const isActive = (schedule.timeMode ?? 'fixed') === timeMode
                      return (
                        <button
                          key={timeMode}
                          type="button"
                          className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                            isActive
                              ? 'bg-[var(--c-ocean)] text-white'
                              : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                          }`}
                          onClick={() =>
                            patchEditing({
                              schedules: resolveOfferingSchedules(editing).map((item) =>
                                item.id === schedule.id
                                  ? {
                                      ...item,
                                      timeMode: timeMode as NonNullable<typeof item.timeMode>,
                                    }
                                  : item
                              ),
                            })
                          }
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {scheduleIsOpen(schedule) ? (
                  <div className="rounded-[var(--r-sm)] border border-dashed border-[var(--c-border)] bg-white p-3 text-sm text-[var(--c-text-2)]">
                    Publica esta clase como horario abierto para acordar día y hora con cada alumno.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-[var(--c-text-2)]">
                        Fechas disponibles
                      </span>
                      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                        {[
                          ['always', 'Siempre'],
                          ['next_week', 'Solo próxima semana'],
                          ['dates', 'Solo algunas fechas'],
                        ].map(([mode, label]) => {
                          const isActive = (schedule.availabilityMode ?? 'always') === mode
                          return (
                            <button
                              key={mode}
                              type="button"
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                isActive
                                  ? 'bg-[var(--c-ocean)] text-white'
                                  : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                              }`}
                              onClick={() =>
                                patchEditing({
                                  schedules: resolveOfferingSchedules(editing).map((item) =>
                                    item.id === schedule.id
                                      ? {
                                          ...item,
                                          availabilityMode: mode as NonNullable<
                                            typeof item.availabilityMode
                                          >,
                                        }
                                      : item
                                  ),
                                })
                              }
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                      {(schedule.availabilityMode ?? 'always') === 'dates' && (
                        <div className="grid gap-3 lg:grid-cols-[18rem_1fr] lg:items-end">
                          <DateField
                            label={`Agregar fecha disponible · ${(schedule.availableDates || []).length} ${
                              (schedule.availableDates || []).length === 1 ? 'fecha' : 'fechas'
                            }`}
                            onChange={(event) => {
                              if (!event.target.value) return
                              patchEditing({
                                schedules: resolveOfferingSchedules(editing).map((item) =>
                                  item.id === schedule.id
                                    ? {
                                        ...item,
                                        availableDates: [
                                          ...new Set([
                                            ...(item.availableDates || []),
                                            event.target.value,
                                          ]),
                                        ].sort(),
                                      }
                                    : item
                                ),
                              })
                              event.target.value = ''
                            }}
                          />
                          <div className="-mx-1 flex min-h-12 gap-2 overflow-x-auto px-1 py-1 lg:mx-0 lg:min-h-14 lg:flex-wrap lg:items-center lg:overflow-visible lg:rounded-2xl lg:border lg:border-[var(--c-border)] lg:bg-white lg:px-3 lg:py-2 lg:shadow-[var(--shadow-sm)]">
                            {(schedule.availableDates || []).length === 0 && (
                              <span className="shrink-0 px-2 py-2 text-sm text-[var(--c-text-2)]">
                                Aún no agregas fechas.
                              </span>
                            )}
                            {(schedule.availableDates || []).map((availableDate) => {
                              const label = new Date(
                                `${availableDate}T12:00:00`
                              ).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                              return (
                                <button
                                  key={availableDate}
                                  type="button"
                                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--c-ocean)] transition hover:border-[var(--c-aqua)]"
                                  onClick={() =>
                                    patchEditing({
                                      schedules: resolveOfferingSchedules(editing).map((item) =>
                                        item.id === schedule.id
                                          ? {
                                              ...item,
                                              availableDates: (item.availableDates || []).filter(
                                                (date) => date !== availableDate
                                              ),
                                            }
                                          : item
                                      ),
                                    })
                                  }
                                >
                                  {label}
                                  <span aria-hidden="true" className="text-[var(--c-text-2)]">
                                    ×
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {OFFERING_DAYS.map((day) => {
                        const isSelected = schedule.days.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${
                              isSelected
                                ? 'bg-[var(--c-ocean)] text-white'
                                : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                            }`}
                            onClick={() =>
                              patchEditing({
                                schedules: resolveOfferingSchedules(editing).map((item) =>
                                  item.id === schedule.id
                                    ? {
                                        ...item,
                                        days: isSelected
                                          ? item.days.filter((currentDay) => currentDay !== day)
                                          : [...item.days, day],
                                      }
                                    : item
                                ),
                              })
                            }
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TimeField
                        label="Desde"
                        value={schedule.startTime}
                        onChange={(event) =>
                          patchEditing({
                            schedules: resolveOfferingSchedules(editing).map((item) =>
                              item.id === schedule.id
                                ? { ...item, startTime: event.target.value }
                                : item
                            ),
                          })
                        }
                      />
                      <TimeField
                        label="Hasta"
                        value={schedule.endTime}
                        onChange={(event) =>
                          patchEditing({
                            schedules: resolveOfferingSchedules(editing).map((item) =>
                              item.id === schedule.id
                                ? { ...item, endTime: event.target.value }
                                : item
                            ),
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            ))}

            <button
              type="button"
              className="btn btn-ghost self-start"
              onClick={() =>
                patchEditing({
                  schedules: [...resolveOfferingSchedules(editing), createOfferingSchedule()],
                })
              }
            >
              <FiPlus /> Agregar horario
            </button>
          </div>
        )}

        {step === 3 && (
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

            <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-bg)] p-4">
              <p className="font-semibold text-[var(--c-ocean)]">{offeringHeadline(editing)}</p>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">{offeringWhen(editing)}</p>
              <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                {offeringPrice(editing)}
              </p>
            </div>
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
          {step < 3 ? (
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
