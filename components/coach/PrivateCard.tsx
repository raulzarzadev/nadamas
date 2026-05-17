'use client'
import { useEffect, useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import ImageInput from '@comps/Inputs/ImageInput'
import ProfileSection from './ProfileSection'
import { optimizeImageForUpload } from '@/lib/image-optimizer'
import {
  GENERIC_USER_ERROR,
  reportInternalError,
} from '@/lib/user-facing-error'
import type {
  CoachDocument,
  CoachIdentityVerification,
} from '@/firebase/coaches/coach.model'

interface PrivateValue {
  identityVerification?: CoachIdentityVerification
}

const STATUS_COPY: Record<CoachIdentityVerification['status'], string> = {
  not_submitted: 'Aún no has subido tu INE.',
  pending: 'Tu INE está en revisión por un administrador.',
  verified: 'Identidad validada por el equipo.',
  rejected: 'La revisión fue rechazada. Sube una imagen más clara.',
}

export default function PrivateCard({
  uid,
  value,
  saving,
  onSave,
}: {
  uid: string
  value: PrivateValue
  saving: boolean
  onSave: (v: PrivateValue) => void
}) {
  const [draft, setDraft] = useState<PrivateValue>(value || {})
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setDraft(value || {}), [value])

  const verification = draft.identityVerification || {
    status: 'not_submitted' as const,
  }

  const uploadIne = async (file: File) => {
    setError(null)
    setBusy(true)
    let finished = false

    let uploadFile = file
    try {
      uploadFile = (await optimizeImageForUpload(file)).file
    } catch (uploadError) {
      reportInternalError('INE_PREPARE', uploadError)
      setError(GENERIC_USER_ERROR)
      setBusy(false)
      return
    }

    CoachCRUD.uploadAsset({ file: uploadFile, uid, scope: 'private' }, (uploadProgress, url) => {
      if (typeof uploadProgress === 'number') setProgress(uploadProgress)
      if (!url || finished) return
      finished = true
      const document: CoachDocument = { url, name: uploadFile.name }
      setDraft({
        identityVerification: {
          status: 'pending',
          document,
          submittedAt: Date.now(),
        },
      })
      setBusy(false)
      setProgress(undefined)
    })

    setTimeout(() => {
      if (finished) return
      finished = true
      setError('No se pudo subir la INE. Intenta de nuevo.')
      setBusy(false)
      setProgress(undefined)
    }, 30000)
  }

  return (
    <ProfileSection
      title="Mis documentos (verificación)"
      description="Sube únicamente tu INE. Esta sección es privada y un administrador debe validar la identidad antes de marcarla como verificada."
      summary={`INE · ${STATUS_COPY[verification.status]}`}
      surface="tinted"
    >
        {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

        <ImageInput
          label="INE"
          imageUrl={verification.document?.url}
          imageAlt="INE subida"
          busy={busy}
          progress={progress}
          helperText={`${STATUS_COPY[verification.status]}${verification.document?.name ? ` · ${verification.document.name}` : ''}`}
          onFileSelected={uploadIne}
        />

        <div className="flex flex-col gap-3 border-t border-[var(--c-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--c-text-2)]">
            Flujo admin: pendiente → verificada o rechazada.
          </p>
          <button
            type="button"
            disabled={saving || busy || !verification.document}
            onClick={() => onSave({ identityVerification: verification })}
            className="btn btn-primary min-w-36 self-start disabled:opacity-50 sm:self-auto"
          >
            {saving ? 'Guardando…' : 'Guardar documento'}
          </button>
        </div>
    </ProfileSection>
  )
}
