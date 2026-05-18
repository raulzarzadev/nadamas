'use client'
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
  offeringWhen,
  resolveOfferings,
  resolveOfferingSchedules,
} from '@/lib/coach-offerings'
import { optimizeImageForUpload } from '@/lib/image-optimizer'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
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
          resolveOfferingSchedules(offering).some((schedule) => schedule.days.length > 0)
      )
    )
    closeStepper()
  }

  function stepValid(currentStep: number, offering: CoachClassOffering) {
    if (currentStep === 1)
      return offering.mode === 'home'
        ? !!offering.coverageArea?.trim()
        : !!offering.placeName?.trim()
    if (currentStep === 2)
      return resolveOfferingSchedules(offering).some(
        (schedule) => schedule.days.length > 0 && !!schedule.startTime && !!schedule.endTime
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
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${
                step === index + 1
                  ? 'bg-[var(--c-ocean)] text-white'
                  : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
              }`}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {(['fixed', 'home'] as const).map((mode) => (
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
                  {mode === 'fixed' ? '📍 Lugar fijo' : '🏠 A domicilio'}
                </button>
              ))}
            </div>

            {editing.mode === 'fixed' ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--c-ocean)]">
                    Nombre del lugar
                  </span>
                  <input
                    className="input input-bordered bg-white"
                    placeholder="Ej. Alberca El Coromuel"
                    value={editing.placeName || ''}
                    onChange={(event) => patchEditing({ placeName: event.target.value })}
                  />
                </label>
                <details className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--c-text-2)]">
                    Más opciones (opcional)
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <input
                      className="input input-bordered bg-white"
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
            ) : (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[var(--c-ocean)]">
                  Zona / colonias que cubro
                </span>
                <input
                  className="input input-bordered bg-white"
                  placeholder="Ej. Centro y Fovissste, La Paz"
                  value={editing.coverageArea || ''}
                  onChange={(event) => patchEditing({ coverageArea: event.target.value })}
                />
              </label>
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
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[var(--c-ocean)]">
                  Cupo máximo (opcional)
                </span>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  className="input input-bordered w-32 bg-white"
                  placeholder="8"
                  value={editing.maxPeople ?? ''}
                  onChange={(event) =>
                    patchEditing({
                      maxPeople: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
              </label>
            )}

            {resolveOfferingSchedules(editing).map((schedule, scheduleIndex) => (
              <div
                key={schedule.id}
                className="flex flex-col gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3"
              >
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
                      <label className="flex flex-col gap-1.5">
                        <span className="flex items-center gap-2 text-xs font-semibold text-[var(--c-text-2)]">
                          Agregar fecha disponible
                          <span className="rounded-full bg-[var(--c-surface)] px-2 py-0.5 text-[0.7rem] font-bold text-[var(--c-ocean)]">
                            {(schedule.availableDates || []).length}{' '}
                            {(schedule.availableDates || []).length === 1 ? 'fecha' : 'fechas'}
                          </span>
                        </span>
                        <input
                          type="date"
                          className="input input-bordered h-14 w-full rounded-2xl border-[var(--c-border)] bg-white px-5 text-base font-semibold text-[var(--c-ocean)] shadow-[var(--shadow-sm)] focus:border-[var(--c-aqua)]"
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
                      </label>
                      <div className="-mx-1 flex min-h-12 gap-2 overflow-x-auto px-1 py-1 lg:mx-0 lg:min-h-14 lg:flex-wrap lg:items-center lg:overflow-visible lg:rounded-2xl lg:border lg:border-[var(--c-border)] lg:bg-white lg:px-3 lg:py-2 lg:shadow-[var(--shadow-sm)]">
                        {(schedule.availableDates || []).length === 0 && (
                          <span className="shrink-0 px-2 py-2 text-sm text-[var(--c-text-2)]">
                            Aún no agregas fechas.
                          </span>
                        )}
                        {(schedule.availableDates || []).map((availableDate) => {
                          const label = new Date(`${availableDate}T12:00:00`).toLocaleDateString(
                            'es-MX',
                            { day: 'numeric', month: 'short' }
                          )
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
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-[var(--c-text-2)]">Desde</span>
                    <input
                      type="time"
                      className="input input-bordered h-12 border-[var(--c-border)] bg-white font-semibold text-[var(--c-ocean)] shadow-sm focus:border-[var(--c-aqua)]"
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
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-[var(--c-text-2)]">Hasta</span>
                    <input
                      type="time"
                      className="input input-bordered h-12 border-[var(--c-border)] bg-white font-semibold text-[var(--c-ocean)] shadow-sm focus:border-[var(--c-aqua)]"
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
                  </label>
                </div>
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
            <div className="flex gap-3">
              <label className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)]">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="input input-bordered w-full border-[var(--c-border)] bg-white pl-7 font-semibold text-[var(--c-ocean)] shadow-sm focus:border-[var(--c-aqua)]"
                  placeholder="450"
                  value={editing.price ?? ''}
                  onChange={(event) =>
                    patchEditing({ price: event.target.value ? Number(event.target.value) : null })
                  }
                />
              </label>
              <select
                className="select select-bordered border-[var(--c-border)] bg-white font-semibold text-[var(--c-ocean)] shadow-sm focus:border-[var(--c-aqua)]"
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
              </select>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[var(--c-ocean)]">
                Detalles (opcional)
              </span>
              <input
                className="input input-bordered border-[var(--c-border)] bg-white font-semibold text-[var(--c-ocean)] shadow-sm focus:border-[var(--c-aqua)]"
                placeholder="Ej. Incluye evaluación inicial"
                value={editing.details || ''}
                onChange={(event) => patchEditing({ details: event.target.value })}
              />
            </label>

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
      title="Lugares, horarios y precios"
      description="Cada clase que ofreces: dónde la das, qué días y horario, y cuánto cuesta. Puedes tener una en un lugar fijo y otra a domicilio con precio distinto."
      summary={`${offerings.length} ${offerings.length === 1 ? 'clase' : 'clases'}`}
    >
      {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

      {offerings.length === 0 && (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-8 text-center text-sm text-[var(--c-text-2)]">
          Aún no agregas clases. Empieza con la primera.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {offerings.map((offering) => (
          <article
            key={offering.id}
            className="flex items-start justify-between gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-[var(--c-ocean)]">{offeringHeadline(offering)}</p>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">{offeringWhen(offering)}</p>
              <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                {offeringPrice(offering)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
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
            </div>
          </article>
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
