'use client'
import { useEffect, useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import { FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi'
import ImageInput from '@comps/Inputs/ImageInput'
import ProfileSection from './ProfileSection'
import { optimizeImageForUpload } from '@/lib/image-optimizer'
import type {
  CoachGalleryPhoto,
  CoachTeachingLocation,
} from '@/firebase/coaches/coach.model'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface LocationsValue {
  teachingLocations?: CoachTeachingLocation[]
  galleryPhotos?: CoachGalleryPhoto[]
}

function createLocation(): CoachTeachingLocation {
  return {
    id: crypto.randomUUID(),
    name: '',
    locationUrl: '',
    availability: [{ days: [], startTime: '', endTime: '' }],
  }
}

export default function LocationsCard({
  uid,
  value,
  saving,
  onSave,
}: {
  uid: string
  value: LocationsValue
  saving: boolean
  onSave: (v: LocationsValue) => void
}) {
  const [locations, setLocations] = useState<CoachTeachingLocation[]>(
    value.teachingLocations || []
  )
  const [galleryPhotos, setGalleryPhotos] = useState<CoachGalleryPhoto[]>(
    value.galleryPhotos || []
  )
  const [busyLocationId, setBusyLocationId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setLocations(value.teachingLocations || []), [value.teachingLocations])
  useEffect(() => setGalleryPhotos(value.galleryPhotos || []), [value.galleryPhotos])

  const uploadLocationImage = async (locationId: string, file: File) => {
    setError(null)
    setBusyLocationId(locationId)
    let finished = false

    let uploadFile = file
    try {
      uploadFile = (await optimizeImageForUpload(file)).file
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'No se pudo preparar la imagen.'
      )
      setBusyLocationId(null)
      return
    }

    CoachCRUD.uploadAsset({ file: uploadFile, uid, scope: 'public' }, (progress, url) => {
      if (typeof progress === 'number') {
        setUploadProgress((current) => ({ ...current, [locationId]: progress }))
      }
      if (!url || finished) return
      finished = true
      setLocations((current) =>
        current.map((location) =>
          location.id === locationId ? { ...location, imageUrl: url } : location
        )
      )
      setGalleryPhotos((current) => [
        ...current,
        { url, label: 'Lugares de trabajo' },
      ])
      setUploadProgress((current) => {
        const next = { ...current }
        delete next[locationId]
        return next
      })
      setBusyLocationId(null)
    })

    setTimeout(() => {
      if (finished) return
      finished = true
      setError('No se pudo subir la imagen del lugar.')
      setUploadProgress((current) => {
        const next = { ...current }
        delete next[locationId]
        return next
      })
      setBusyLocationId(null)
    }, 30000)
  }

  return (
    <ProfileSection
      title="Horarios y lugares"
      description="Agrega dónde das clases, tu ubicación y los horarios disponibles en cada lugar."
      summary={`${locations.length} ${locations.length === 1 ? 'lugar' : 'lugares'} configurados`}
    >
        {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

        {locations.map((location, index) => (
          <article
            key={location.id}
            className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3 sm:p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <input
                  aria-label={`Nombre del lugar ${index + 1}`}
                  className="input input-bordered w-full bg-white font-semibold"
                  placeholder="Ej. Alberca AquaFit Centro"
                  value={location.name}
                  onChange={(event) =>
                    setLocations((current) =>
                      current.map((item) =>
                        item.id === location.id
                          ? { ...item, name: event.target.value }
                          : item
                      )
                    )
                  }
                />
              </div>
              <button
                type="button"
                aria-label={`Quitar lugar ${index + 1}`}
                className="btn btn-ghost text-[var(--c-error,#b91c1c)]"
                onClick={() =>
                  setLocations((current) =>
                    current.filter((item) => item.id !== location.id)
                  )
                }
              >
                <FiTrash2 />
              </button>
            </div>

            <label className="relative">
              <FiMapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-ocean-mid)]" />
              <input
              className="input input-bordered w-full bg-white pl-10"
              placeholder="URL de ubicación (Google Maps)"
              value={location.locationUrl || ''}
              onChange={(event) =>
                setLocations((current) =>
                  current.map((item) =>
                    item.id === location.id
                      ? { ...item, locationUrl: event.target.value }
                      : item
                  )
                )
              }
              />
            </label>

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--c-ocean)]">Horarios</p>
                <p className="text-sm text-[var(--c-text-2)]">
                  Define los días y horas en que das clase aquí.
                </p>
              </div>
              {location.availability.length === 0 && (
                <div className="rounded-[var(--r-sm)] border border-dashed border-[var(--c-border)] bg-white px-3 py-4 text-sm text-[var(--c-text-2)]">
                  Aún no agregas horarios para este lugar.
                </div>
              )}
              {location.availability.map((slot, slotIndex) => (
                <div
                  key={`${location.id}-${slotIndex}`}
                  className="relative flex flex-col gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white p-3 pr-14"
                >
                  <button
                    type="button"
                    aria-label={`Eliminar horario ${slotIndex + 1}`}
                    className="btn btn-ghost btn-sm absolute right-2 top-2 text-[var(--c-error,#b91c1c)]"
                    onClick={() =>
                      setLocations((current) =>
                        current.map((item) =>
                          item.id === location.id
                            ? {
                                ...item,
                                availability: item.availability.filter(
                                  (_, currentIndex) => currentIndex !== slotIndex
                                ),
                              }
                            : item
                        )
                      )
                    }
                  >
                    <FiTrash2 aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => {
                      const selected = slot.days.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            selected
                              ? 'bg-[var(--c-ocean)] text-white'
                              : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                          }`}
                          onClick={() =>
                            setLocations((current) =>
                              current.map((item) =>
                                item.id !== location.id
                                  ? item
                                  : {
                                      ...item,
                                      availability: item.availability.map((currentSlot, currentIndex) =>
                                        currentIndex !== slotIndex
                                          ? currentSlot
                                          : {
                                              ...currentSlot,
                                              days: selected
                                                ? currentSlot.days.filter((itemDay) => itemDay !== day)
                                                : [...currentSlot.days, day],
                                            }
                                      ),
                                    }
                              )
                            )
                          }
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="time"
                      className="input input-bordered bg-white"
                      value={slot.startTime}
                      onChange={(event) =>
                        setLocations((current) =>
                          current.map((item) =>
                            item.id !== location.id
                              ? item
                              : {
                                  ...item,
                                  availability: item.availability.map((currentSlot, currentIndex) =>
                                    currentIndex === slotIndex
                                      ? { ...currentSlot, startTime: event.target.value }
                                      : currentSlot
                                  ),
                                }
                          )
                        )
                      }
                    />
                    <input
                      type="time"
                      className="input input-bordered bg-white"
                      value={slot.endTime}
                      onChange={(event) =>
                        setLocations((current) =>
                          current.map((item) =>
                            item.id !== location.id
                              ? item
                              : {
                                  ...item,
                                  availability: item.availability.map((currentSlot, currentIndex) =>
                                    currentIndex === slotIndex
                                      ? { ...currentSlot, endTime: event.target.value }
                                      : currentSlot
                                  ),
                                }
                          )
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost self-start"
                onClick={() =>
                  setLocations((current) =>
                    current.map((item) =>
                      item.id === location.id
                        ? {
                            ...item,
                            availability: [
                              ...item.availability,
                              { days: [], startTime: '', endTime: '' },
                            ],
                          }
                        : item
                    )
                  )
                }
              >
                <FiPlus /> Agregar horario
              </button>
            </div>

            <ImageInput
              label="Imagen del lugar"
              imageUrl={location.imageUrl}
              imageAlt={location.name || 'Lugar de clases'}
              busy={busyLocationId === location.id}
              progress={uploadProgress[location.id]}
              helperText="También se agrega a tu galería como “Lugares de trabajo”."
              onFileSelected={(file) => uploadLocationImage(location.id, file)}
            />
          </article>
        ))}

        <button
          type="button"
          className="btn btn-ghost self-start"
          onClick={() => setLocations((current) => [...current, createLocation()])}
        >
          <FiPlus /> Agregar lugar
        </button>

        <div className="flex justify-end border-t border-[var(--c-border)] pt-5">
          <button
            type="button"
            disabled={saving || !!busyLocationId}
            onClick={() => onSave({ teachingLocations: locations, galleryPhotos })}
            className="btn btn-primary min-w-36 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar lugares'}
          </button>
        </div>
    </ProfileSection>
  )
}
