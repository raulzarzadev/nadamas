'use client'
import { useState } from 'react'
import Image from 'next/image'
import ImageInput from './ImageInput'

export interface GalleryPhotoValue {
  url: string
  label?: string
}

interface PhotoGalleryInputProps<TPhoto extends GalleryPhotoValue> {
  photos: TPhoto[]
  maxPhotos?: number
  uploading?: boolean
  disabled?: boolean
  tagOptions?: string[]
  onFilesSelected: (files: File[]) => void
  onChange: (photos: TPhoto[]) => void
}

export default function PhotoGalleryInput<TPhoto extends GalleryPhotoValue>({
  photos,
  maxPhotos = 20,
  uploading = false,
  disabled = false,
  tagOptions = [],
  onFilesSelected,
  onChange,
}: PhotoGalleryInputProps<TPhoto>) {
  const [previewPhoto, setPreviewPhoto] = useState<TPhoto | null>(null)
  const remainingSlots = Math.max(maxPhotos - photos.length, 0)
  const isFull = remainingSlots === 0

  return (
    <div className="flex flex-col gap-4">
      <ImageInput
        label="Fotos"
        imageAlt="Galería"
        busy={uploading}
        disabled={disabled || isFull}
        multiple
        buttonLabel={uploading ? 'Subiendo fotos…' : 'Agregar fotos'}
        helperText={`JPG, PNG, WEBP o AVIF · hasta ${maxPhotos} fotos`}
        onFilesSelected={(files) => onFilesSelected(files.slice(0, remainingSlots))}
      />
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[var(--c-ocean)]">
          {photos.length}/{maxPhotos} fotos
        </span>
        <span className="text-[var(--c-text-2)]">
          {isFull ? 'Galería completa' : `${remainingSlots} disponibles`}
        </span>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <article
              key={`${photo.url}-${index}`}
              className="overflow-hidden rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]"
            >
              <div className="relative aspect-square bg-[var(--c-surface)]">
                <button
                  type="button"
                  aria-label={`Ver foto ${index + 1}`}
                  onClick={() => setPreviewPhoto(photo)}
                  className="absolute inset-0"
                >
                  <Image
                    src={photo.url}
                    alt={photo.label || `Foto ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    quality={100}
                    className="object-cover"
                  />
                </button>
                <button
                  type="button"
                  aria-label={`Quitar foto ${index + 1}`}
                  onClick={() => onChange(photos.filter((_, i) => i !== index))}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(10,37,64,0.9)] text-lg text-white shadow-[var(--shadow-sm)]"
                >
                  ×
                </button>
              </div>

              <label className="flex flex-col gap-1 p-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-2)]">
                  Etiqueta
                </span>
                <select
                  className="select select-bordered select-sm w-full bg-white text-[var(--c-ocean)]"
                  value={photo.label || ''}
                  onChange={(event) =>
                    onChange(
                      photos.map((item, i) =>
                        i === index ? ({ ...item, label: event.target.value } as TPhoto) : item
                      )
                    )
                  }
                >
                  <option value="" disabled>
                    Elige una etiqueta…
                  </option>
                  {tagOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}

      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={previewPhoto.label || 'Vista previa de foto'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,37,64,0.72)] p-4 backdrop-blur-sm"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative h-[min(80vh,720px)] w-full max-w-4xl">
            <Image
              src={previewPhoto.url}
              alt={previewPhoto.label || 'Vista previa de foto'}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              quality={100}
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
