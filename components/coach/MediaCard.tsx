'use client'
import { useEffect, useState } from 'react'
import PhotoGalleryInput from '@comps/Inputs/PhotoGalleryInput'
import ProfileSection from './ProfileSection'
import { CoachCRUD } from '@/firebase/coaches/main'
import type {
  CoachGalleryPhoto,
  CoachPhoto,
} from '@/firebase/coaches/coach.model'

const MAX_GALLERY_PHOTOS = 20
const PHOTO_TAGS = ['Yo', 'Lugares de trabajo', 'Logros y eventos', 'Mis clases']

interface MediaValue {
  galleryPhotos?: CoachGalleryPhoto[]
  facePhoto?: CoachPhoto
  workplacePhotos?: CoachPhoto[]
  achievementPhotos?: CoachPhoto[]
}

function toGallery(value: MediaValue): CoachGalleryPhoto[] {
  if (value.galleryPhotos?.length) return value.galleryPhotos

  return [
    ...(value.facePhoto ? [{ ...value.facePhoto, label: 'Yo' }] : []),
    ...(value.workplacePhotos || []).map((photo) => ({
      ...photo,
      label: 'Lugares de trabajo',
    })),
    ...(value.achievementPhotos || []).map((photo) => ({
      ...photo,
      label: 'Logros y eventos',
    })),
  ].slice(0, MAX_GALLERY_PHOTOS)
}

function toLegacyFields(galleryPhotos: CoachGalleryPhoto[]) {
  return {
    facePhoto: galleryPhotos.find((photo) => photo.label === 'Yo'),
    workplacePhotos: galleryPhotos.filter(
      (photo) => photo.label === 'Lugares de trabajo'
    ),
    achievementPhotos: galleryPhotos.filter(
      (photo) => photo.label === 'Logros y eventos'
    ),
  }
}

export default function MediaCard({
  uid,
  value,
  saving,
  onSave,
}: {
  uid: string
  value: MediaValue
  saving: boolean
  onSave: (v: MediaValue) => void
}) {
  const [galleryPhotos, setGalleryPhotos] = useState<CoachGalleryPhoto[]>(
    toGallery(value || {})
  )
  const [pendingUploads, setPendingUploads] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setGalleryPhotos(toGallery(value || {}))
  }, [
    value.galleryPhotos,
    value.facePhoto,
    value.workplacePhotos,
    value.achievementPhotos,
  ])

  const uploadFiles = (files: File[]) => {
    const allowedFiles = files.slice(
      0,
      Math.max(MAX_GALLERY_PHOTOS - galleryPhotos.length, 0)
    )
    if (!allowedFiles.length) return

    setError(null)
    setPendingUploads((count) => count + allowedFiles.length)

    allowedFiles.forEach((file) => {
      let finished = false
      CoachCRUD.uploadAsset({ file, uid, scope: 'public' }, (_, url) => {
        if (!url || finished) return
        finished = true
        setGalleryPhotos((photos) => [
          ...photos,
          { url, label: '' },
        ].slice(0, MAX_GALLERY_PHOTOS))
        setPendingUploads((count) => Math.max(count - 1, 0))
      })

      setTimeout(() => {
        if (finished) return
        finished = true
        setError('No se pudo subir una imagen. Intenta de nuevo.')
        setPendingUploads((count) => Math.max(count - 1, 0))
      }, 30000)
    })
  }

  const unlabeledCount = galleryPhotos.filter((photo) => !photo.label).length

  return (
    <ProfileSection
      title="Galería"
      description="Sube hasta 20 fotos y etiqueta cada una para contar mejor quién eres, dónde enseñas y qué has construido."
      summary={`${galleryPhotos.length}/20 fotos · ${unlabeledCount ? `${unlabeledCount} sin etiqueta` : 'todo etiquetado'}`}
    >
        {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

        <PhotoGalleryInput
          photos={galleryPhotos}
          maxPhotos={MAX_GALLERY_PHOTOS}
          uploading={pendingUploads > 0}
          disabled={saving}
          tagOptions={PHOTO_TAGS}
          onFilesSelected={uploadFiles}
          onChange={setGalleryPhotos}
        />

        <div className="flex flex-col gap-3 border-t border-[var(--c-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--c-text-2)]">
            {unlabeledCount > 0
              ? `Falta etiquetar ${unlabeledCount} ${unlabeledCount === 1 ? 'foto' : 'fotos'}.`
              : 'Cada foto ya tiene contexto para mostrarse mejor en tu perfil.'}
          </p>

          <button
            type="button"
            disabled={saving || pendingUploads > 0 || unlabeledCount > 0}
            onClick={() =>
              onSave({ galleryPhotos, ...toLegacyFields(galleryPhotos) })
            }
            className="btn btn-primary min-w-36 self-start disabled:opacity-50 sm:self-auto"
          >
            {saving ? 'Guardando…' : 'Guardar galería'}
          </button>
        </div>
    </ProfileSection>
  )
}
