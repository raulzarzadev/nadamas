'use client'
import { FiImage, FiUpload } from 'react-icons/fi'

export default function ImageUploadField({
  label,
  helperText,
  imageUrl,
  imageAlt,
  busy = false,
  onFileSelected,
}: {
  label: string
  helperText?: string
  imageUrl?: string
  imageAlt: string
  busy?: boolean
  onFileSelected: (file: File) => void
}) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white p-3">
      <p className="text-sm font-semibold text-[var(--c-ocean)]">{label}</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-[var(--r-sm)] bg-[var(--c-surface)] sm:w-28">
          {imageUrl ? (
            <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
          ) : (
            <FiImage className="h-6 w-6 text-[var(--c-ocean-mid)]" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label className="btn btn-outline self-start">
            <FiUpload /> {busy ? 'Subiendo…' : imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onFileSelected(file)
              }}
            />
          </label>
          {helperText && <p className="text-sm text-[var(--c-text-2)]">{helperText}</p>}
        </div>
      </div>
    </div>
  )
}
