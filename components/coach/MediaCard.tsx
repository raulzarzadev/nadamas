'use client'
import PhotoGalleryInput from '@comps/Inputs/PhotoGalleryInput'
import SaveButton from '@comps/SaveButton'
import { useEffect, useState } from 'react'
import type { CoachGalleryPhoto, CoachPhoto } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { useAutosave } from '@/hooks/useAutosave'
import { optimizeImageForUpload } from '@/lib/image-optimizer'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import ProfileSection from './ProfileSection'

const MAX_GALLERY_PHOTOS = 20
const PHOTO_TAGS = ['Yo', 'Lugares de trabajo', 'Logros y eventos', 'Mis clases']

interface MediaValue {
  galleryPhotos?: CoachGalleryPhoto[]
  facePhoto?: CoachPhoto | null
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
    facePhoto: galleryPhotos.find((photo) => photo.label === 'Yo') ?? null,
    workplacePhotos: galleryPhotos.filter((photo) => photo.label === 'Lugares de trabajo'),
    achievementPhotos: galleryPhotos.filter((photo) => photo.label === 'Logros y eventos'),
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
  const {
    galleryPhotos: valueGalleryPhotos,
    facePhoto: valueFacePhoto,
    workplacePhotos: valueWorkplacePhotos,
    achievementPhotos: valueAchievementPhotos,
  } = value
  const [galleryPhotos, setGalleryPhotos] = useState<CoachGalleryPhoto[]>(
    toGallery({
      galleryPhotos: valueGalleryPhotos,
      facePhoto: valueFacePhoto,
      workplacePhotos: valueWorkplacePhotos,
      achievementPhotos: valueAchievementPhotos,
    })
  )
  const [pendingUploads, setPendingUploads] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setGalleryPhotos(
      toGallery({
        galleryPhotos: valueGalleryPhotos,
        facePhoto: valueFacePhoto,
        workplacePhotos: valueWorkplacePhotos,
        achievementPhotos: valueAchievementPhotos,
      })
    )
  }, [valueGalleryPhotos, valueFacePhoto, valueWorkplacePhotos, valueAchievementPhotos])

  const uploadFiles = (files: File[]) => {
    const allowedFiles = files.slice(0, Math.max(MAX_GALLERY_PHOTOS - galleryPhotos.length, 0))
    if (!allowedFiles.length) return

    setError(null)
    setPendingUploads((count) => count + allowedFiles.length)

    allowedFiles.forEach(async (file) => {
      let finished = false
      let uploadFile = file

      try {
        uploadFile = (await optimizeImageForUpload(file)).file
      } catch (uploadError) {
        finished = true
        reportInternalError('GALLERY_PREPARE', uploadError)
        setError(GENERIC_USER_ERROR)
        setPendingUploads((count) => Math.max(count - 1, 0))
        return
      }

      CoachCRUD.uploadAsset({ file: uploadFile, uid, scope: 'public' }, (_, url) => {
        if (!url || finished) return
        finished = true
        setGalleryPhotos((photos) => [...photos, { url, label: '' }].slice(0, MAX_GALLERY_PHOTOS))
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
  const hasFacePhoto = galleryPhotos.some((photo) => photo.label === 'Yo')

  const { status: autoStatus, saveNow } = useAutosave(
    JSON.stringify(galleryPhotos),
    () => onSave({ galleryPhotos, ...toLegacyFields(galleryPhotos) }),
    { enabled: pendingUploads === 0 && unlabeledCount === 0 }
  )

  return (
    <ProfileSection
      id="coach-gallery"
      title="Galería"
      description="Sube hasta 20 fotos y etiqueta cada una para contar mejor quién eres, dónde enseñas y qué has construido."
      summary={`${galleryPhotos.length}/20 fotos · ${unlabeledCount ? `${unlabeledCount} sin etiqueta` : 'todo etiquetado'}`}
    >
      {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

      {!hasFacePhoto && (
        <div className="flex items-start gap-3 rounded-[var(--r-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 text-base leading-none" aria-hidden="true">
            📸
          </span>
          <p>
            <span className="font-semibold">Falta una foto tuya.</span> Sube una foto y etiquétala
            como <span className="font-semibold">Yo</span> para que los alumnos puedan reconocerte.
          </p>
        </div>
      )}

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
          {!hasFacePhoto
            ? 'Falta una foto tuya: etiqueta una foto como Yo.'
            : unlabeledCount > 0
              ? `Falta etiquetar ${unlabeledCount} ${unlabeledCount === 1 ? 'foto' : 'fotos'}.`
              : 'Cada foto ya tiene contexto para mostrarse mejor en tu perfil.'}
        </p>

        <SaveButton
          status={saving ? 'saving' : autoStatus}
          onClick={saveNow}
          disabled={pendingUploads > 0 || unlabeledCount > 0}
          idleLabel="Guardado"
          savedLabel="Guardado"
          className="self-start sm:self-auto"
        />
      </div>
    </ProfileSection>
  )
}
