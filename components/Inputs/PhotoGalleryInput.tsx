'use client'
import { useId, useRef } from 'react'

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
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const remainingSlots = Math.max(maxPhotos - photos.length, 0)
  const isFull = remainingSlots === 0

  const handleFiles = (files: FileList | null) => {
    if (!files?.length || isFull) return
    onFilesSelected(Array.from(files).slice(0, remainingSlots))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={inputId}
        className={`group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[var(--c-ocean-mid)] bg-[var(--c-surface)] px-5 py-6 text-center transition hover:bg-[rgba(234,247,251,0.72)] ${
          disabled || uploading || isFull ? 'cursor-not-allowed opacity-70' : ''
        }`}
      >
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-[var(--c-ocean-mid)] shadow-[var(--shadow-sm)]">
          +
        </span>
        <span className="font-semibold text-[var(--c-ocean)]">
          {uploading ? 'Subiendo fotos…' : 'Agregar fotos a la galería'}
        </span>
        <span className="mt-1 text-sm text-[var(--c-text-2)]">
          JPG, PNG o WEBP · hasta {maxPhotos} fotos
        </span>
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        disabled={disabled || uploading || isFull}
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <datalist id={`${inputId}-tags`}>
        {tagOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

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
                <img
                  src={photo.url}
                  alt={photo.label || `Foto ${index + 1}`}
                  className="h-full w-full object-cover"
                />
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
                <input
                  list={`${inputId}-tags`}
                  placeholder="Ej. Mis clases"
                  className="input input-bordered input-sm w-full bg-white text-[var(--c-ocean)]"
                  value={photo.label || ''}
                  onChange={(event) =>
                    onChange(
                      photos.map((item, i) =>
                        i === index
                          ? ({ ...item, label: event.target.value } as TPhoto)
                          : item
                      )
                    )
                  }
                />
              </label>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
