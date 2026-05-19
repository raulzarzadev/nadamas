'use client'
import ImageInput from '@comps/Inputs/ImageInput'
import SaveButton from '@comps/SaveButton'
import { useEffect, useState } from 'react'
import type { CoachDocument, CoachIdentityVerification } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { useAutosave } from '@/hooks/useAutosave'
import { optimizeImageForUpload } from '@/lib/image-optimizer'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import ProfileSection from './ProfileSection'

interface PrivateValue {
  identityVerification?: CoachIdentityVerification
}

const STATUS_COPY: Record<CoachIdentityVerification['status'], string> = {
  not_submitted: 'Aún no has subido tu documento de identidad.',
  pending: 'Tu documento está en revisión por un administrador.',
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

  const { status: autoStatus, saveNow } = useAutosave(
    JSON.stringify(verification),
    () => onSave({ identityVerification: verification }),
    { enabled: !busy && !!verification.document }
  )

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
      // Uploading only stores the document. Verification is requested
      // explicitly from the "Solicitar verificación" button, never here.
      setDraft({
        identityVerification: {
          ...verification,
          status: verification.status === 'verified' ? 'verified' : 'not_submitted',
          document,
        },
      })
      setBusy(false)
      setProgress(undefined)
    })

    setTimeout(() => {
      if (finished) return
      finished = true
      setError('No se pudo subir el documento. Intenta de nuevo.')
      setBusy(false)
      setProgress(undefined)
    }, 30000)
  }

  return (
    <ProfileSection
      id="coach-verification-documents"
      title="Mis documentos (verificación)"
      description="Sube un documento de identidad oficial: identificación nacional, pasaporte, INE, DNI o cédula. Esta sección es privada y un administrador debe validar la identidad antes de marcarla como verificada."
      summary={`Documento de identidad · ${STATUS_COPY[verification.status]}`}
      surface="tinted"
    >
      {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

      <ImageInput
        label="Documento de identidad"
        imageUrl={verification.document?.url}
        imageAlt="Documento de identidad subido"
        busy={busy}
        progress={progress}
        helperText={`${STATUS_COPY[verification.status]}${verification.document?.name ? ` · ${verification.document.name}` : ''}`}
        onFileSelected={uploadIne}
      />

      <p className="rounded-2xl bg-white/70 px-4 py-3 text-xs leading-5 text-[var(--c-text-2)]">
        <span className="font-semibold text-[var(--c-ocean-mid)]">¿Por qué pedimos esto?</span> Solo
        para verificar tu identidad. Los atletas u otros coaches nunca tienen acceso a este
        documento ni a estos datos.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <SaveButton
          status={saving ? 'saving' : autoStatus}
          onClick={saveNow}
          disabled={busy || !verification.document}
          idleLabel="Guardado"
          savedLabel="Guardado"
          className=""
        />
      </div>
    </ProfileSection>
  )
}
