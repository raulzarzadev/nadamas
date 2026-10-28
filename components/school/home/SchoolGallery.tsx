'use client'

import { useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import type { SchoolGalleryPhoto } from '@/lib/school-home'
import { SCHOOL_HOME_SECTION_CLASS } from './SchoolEventsList'

const PREVIEW_COUNT = 6

export default function SchoolGallery({ photos }: { photos: SchoolGalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState<SchoolGalleryPhoto | null>(null)
  if (!photos.length) return null
  const visible = expanded ? photos : photos.slice(0, PREVIEW_COUNT)

  const open = (photo: SchoolGalleryPhoto) => {
    setActive(photo)
    dialogRef.current?.showModal()
  }

  return (
    <section className={SCHOOL_HOME_SECTION_CLASS} aria-labelledby="school-gallery-title">
      <h2 id="school-gallery-title" className="text-xl font-extrabold text-(--c-ocean)">
        Galería
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visible.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => open(photo)}
              aria-label={`Ver foto ${index + 1} en grande`}
              className="block w-full cursor-pointer overflow-hidden rounded-xl bg-(--school-surface) focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {/* biome-ignore lint/performance/noImgElement: remote storage gallery photo */}
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                className="aspect-square w-full object-cover transition hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>
      {photos.length > PREVIEW_COUNT && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-(--school-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Ver todas ({photos.length})
        </button>
      )}
      <dialog
        ref={dialogRef}
        aria-label="Foto de la galería"
        onClose={() => setActive(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') dialogRef.current?.close()
        }}
        className="m-auto max-h-[90vh] max-w-[min(90vw,64rem)] overflow-visible bg-transparent p-0 backdrop:bg-black/80"
      >
        {active && (
          <div className="relative">
            {/* biome-ignore lint/performance/noImgElement: remote storage gallery photo */}
            <img
              src={active.url}
              alt=""
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar foto"
              className="absolute right-2 top-2 grid size-11 cursor-pointer place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        )}
      </dialog>
    </section>
  )
}
