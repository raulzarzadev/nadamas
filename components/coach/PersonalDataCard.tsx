'use client'
import ImageInput from '@comps/Inputs/ImageInput'
import SaveButton from '@comps/SaveButton'
import { useEffect, useState } from 'react'
import PersonalProfileCard from '@/components/profile/PersonalProfileCard'
import type { CoachDocument, CoachIdentityVerification } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { useAutosave } from '@/hooks/useAutosave'
import { optimizeImageForUpload } from '@/lib/image-optimizer'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import ProfileSection from './ProfileSection'

interface IdentityValue {
  identityVerification?: CoachIdentityVerification
}

function identityStatusCopy(verification: CoachIdentityVerification): string {
  if (!verification.document) return 'Aún no has subido tu documento de identidad.'
  switch (verification.status) {
    case 'verified':
      return 'Identidad validada por el equipo.'
    case 'pending':
      return 'Tu documento está en revisión por un administrador.'
    case 'rejected':
      return 'La revisión fue rechazada. Sube una imagen más clara.'
    default:
      return 'Documento subido. Solicita la verificación cuando completes tu perfil.'
  }
}

export default function PersonalDataCard({
  uid,
  identityValue,
  savingIdentity,
  onSaveIdentity,
}: {
  uid: string
  identityValue: IdentityValue
  savingIdentity: boolean
  onSaveIdentity: (v: IdentityValue) => void
}) {
  const [identityDraft, setIdentityDraft] = useState<IdentityValue>(identityValue || {})
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | undefined>()
  const [identityError, setIdentityError] = useState<string | null>(null)

  useEffect(() => setIdentityDraft(identityValue || {}), [identityValue])

  const verification = identityDraft.identityVerification || {
    status: 'not_submitted' as const,
  }

  const { saveNow: saveIdentityNow } = useAutosave(
    JSON.stringify(verification),
    () => onSaveIdentity({ identityVerification: verification }),
    { enabled: !busy && !!verification.document }
  )

  const uploadIne = async (file: File) => {
    setIdentityError(null)
    setBusy(true)
    let finished = false

    let uploadFile = file
    try {
      uploadFile = (await optimizeImageForUpload(file)).file
    } catch (uploadError) {
      reportInternalError('INE_PREPARE', uploadError)
      setIdentityError(GENERIC_USER_ERROR)
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
      setIdentityDraft({
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
      setIdentityError('No se pudo subir el documento. Intenta de nuevo.')
      setBusy(false)
      setProgress(undefined)
    }, 30000)
  }

  return (
    <>
      <PersonalProfileCard />
      <ProfileSection
        id="coach-verification-documents"
        title="Documento de identidad"
        description="Administra los datos de tu perfil y tus documentos de verificación."
        summary={identityStatusCopy(verification)}
        surface="tinted"
      >
        <div className="flex flex-col gap-4 pt-1">
          {identityError && <p className="text-sm text-(--c-error,#b91c1c)">{identityError}</p>}

          <ImageInput
            label="Documento de identidad"
            imageUrl={verification.document?.url}
            imageAlt="Documento de identidad subido"
            busy={busy}
            progress={progress}
            helperText={`${identityStatusCopy(verification)}${verification.document?.name ? ` · ${verification.document.name}` : ''}`}
            onFileSelected={uploadIne}
          />

          <p className="rounded-2xl bg-white/70 px-4 py-3 pt-0 text-xs leading-5 text-(--c-text-2)">
            <span className="font-semibold text-(--c-ocean-mid)">¿Por qué pedimos esto?</span> Solo
            para verificar tu identidad. Los atletas u otros coaches nunca tienen acceso a este
            documento ni a estos datos.
          </p>
        </div>
        <SaveButton
          status={savingIdentity ? 'saving' : 'idle'}
          onClick={() => {
            saveIdentityNow()
          }}
          idleLabel="Guardado"
          savedLabel="Datos guardados"
          className="self-start sm:self-auto"
        />
      </ProfileSection>
    </>
  )
}
