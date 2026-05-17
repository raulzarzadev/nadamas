'use client'
import { useId, useRef, useState } from 'react'
import Image from 'next/image'
import { FiImage, FiPlus } from 'react-icons/fi'

export interface ImageInputProps {
  label: string
  helperText?: string
  imageUrl?: string
  imageAlt: string
  busy?: boolean
  progress?: number
  disabled?: boolean
  accept?: string
  multiple?: boolean
  buttonLabel?: string
  onFileSelected?: (file: File) => void
  onFilesSelected?: (files: File[]) => void
}

export default function ImageInput({
  label,
  helperText,
  imageUrl,
  imageAlt,
  busy = false,
  progress,
  disabled = false,
  accept = 'image/jpeg,image/png,image/webp,image/avif',
  multiple = false,
  buttonLabel,
  onFileSelected,
  onFilesSelected,
}: ImageInputProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const isDisabled = disabled || busy

  if (imageUrl) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-[var(--c-ocean)]">{label}</p>

        <div className="relative flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-3">
          <button
            type="button"
            aria-label={`Ver ${imageAlt}`}
            onClick={() => setIsPreviewOpen(true)}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--r-sm)] bg-[var(--c-surface)]"
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="80px"
              quality={100}
              className="object-cover"
            />
          </button>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--c-ocean)]">
              {buttonLabel || 'Imagen subida'}
            </p>
            {helperText && (
              <p className="mt-1 truncate text-sm text-[var(--c-text-2)]">
                {helperText}
              </p>
            )}
          </div>

          <label
            htmlFor={inputId}
            className={`btn btn-outline btn-sm shrink-0 ${isDisabled ? 'btn-disabled' : ''}`}
          >
            Cambiar
          </label>

          {busy && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-[var(--r-md)] bg-[rgba(10,37,64,0.62)] text-white">
              <span className="loading loading-spinner loading-sm" />
              <span className="text-sm font-semibold">
                {typeof progress === 'number'
                  ? `${Math.round(progress)}%`
                  : 'Subiendo…'}
              </span>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={isDisabled}
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files || [])
            if (multiple && files.length) onFilesSelected?.(files)
            if (!multiple && files[0]) onFileSelected?.(files[0])
            if (inputRef.current) inputRef.current.value = ''
          }}
        />

        {isPreviewOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={imageAlt}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,37,64,0.72)] p-4 backdrop-blur-sm"
            onClick={() => setIsPreviewOpen(false)}
          >
            <div className="relative h-[min(80vh,720px)] w-full max-w-4xl">
              <Image
                src={imageUrl}
                alt={imageAlt}
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

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-[var(--c-ocean)]">{label}</p>

      <label
        htmlFor={inputId}
        className={`group relative flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[var(--r-md)] border border-dashed border-[var(--c-ocean-mid)] bg-[var(--c-surface)] px-5 py-6 text-center transition hover:bg-[rgba(234,247,251,0.72)] ${
          isDisabled ? 'cursor-not-allowed opacity-70' : ''
        }`}
      >
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-[var(--c-ocean-mid)] shadow-[var(--shadow-sm)]">
          {multiple ? <FiPlus /> : <FiImage className="h-5 w-5" />}
        </span>

        <span className="font-semibold text-[var(--c-ocean)]">
          {buttonLabel || (imageUrl ? 'Cambiar imagen' : 'Subir imagen')}
        </span>
        {helperText && (
          <span className="mt-1 text-sm text-[var(--c-text-2)]">{helperText}</span>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(10,37,64,0.62)] text-white">
            <span className="loading loading-spinner loading-md" />
            <span className="text-sm font-semibold">
              {typeof progress === 'number'
                ? `${Math.round(progress)}%`
                : 'Subiendo…'}
            </span>
          </div>
        )}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={isDisabled}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files || [])
          if (multiple && files.length) onFilesSelected?.(files)
          if (!multiple && files[0]) onFileSelected?.(files[0])
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
    </div>
  )
}
