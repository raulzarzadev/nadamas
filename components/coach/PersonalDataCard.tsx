'use client'
import { TextField } from '@comps/Inputs/FormFields'
import ImageInput from '@comps/Inputs/ImageInput'
import SaveButton from '@comps/SaveButton'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import type { CoachDocument, CoachIdentityVerification } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { useAutosave } from '@/hooks/useAutosave'
import { patchAuthed } from '@/lib/client/authed-api'
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
  const { user, refreshUser } = useUser() as {
    user: {
      nickname?: string
      displayName?: string
      name?: string
      firstName?: string
      lastName?: string
    } | null
    refreshUser?: () => Promise<unknown>
  }

  const [nickname, setNickname] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const [identityDraft, setIdentityDraft] = useState<IdentityValue>(identityValue || {})
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | undefined>()
  const [identityError, setIdentityError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setNickname((current) => current || user.nickname || user.displayName || user.name || '')
    setFirstName((current) => current || user.firstName || '')
    setLastName((current) => current || user.lastName || '')
  }, [user])

  useEffect(() => setIdentityDraft(identityValue || {}), [identityValue])

  const { saveNow } = useAutosave(
    JSON.stringify({ nickname, firstName, lastName }),
    () => void save(),
    { enabled: !!nickname.trim() }
  )

  const verification = identityDraft.identityVerification || {
    status: 'not_submitted' as const,
  }

  const { saveNow: saveIdentityNow } = useAutosave(
    JSON.stringify(verification),
    () => onSaveIdentity({ identityVerification: verification }),
    { enabled: !busy && !!verification.document }
  )

  const hasLegalName = !!(user?.firstName?.trim() && user?.lastName?.trim())
  const summary = hasLegalName
    ? `${nickname || 'Sin nombre visible'} · datos completos`
    : 'Falta nombre y apellidos'

  const buttonStatus =
    status === 'saving' || savingIdentity ? 'saving' : status === 'error' ? 'error' : status

  async function save() {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setStatus('error')
      setMessage('El nombre visible es obligatorio.')
      return
    }
    setStatus('saving')
    setMessage(null)
    try {
      await patchAuthed('/api/profile', {
        nickname: trimmed,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      await refreshUser?.()
      setStatus('saved')
      setMessage('Datos guardados')
    } catch {
      setStatus('error')
      setMessage('No se pudo guardar. Intenta de nuevo.')
    }
  }

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
    <ProfileSection
      id="coach-verification-documents"
      title="Datos personales"
      description="El nombre visible es lo que ven los atletas. Tus nombre(s) y apellido(s) se cotejan con tu documento de identidad y nunca se muestran públicamente."
      summary={summary}
      surface="tinted"
    >
      <TextField
        label="Nombre visible (nickname)"
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        placeholder="Cómo quieres que te vean"
      />

      <TextField
        label="Nombre(s)"
        value={firstName}
        onChange={(event) => setFirstName(event.target.value)}
        placeholder="Como aparece en tu documento"
        autoComplete="given-name"
      />

      <TextField
        label="Apellido(s)"
        value={lastName}
        onChange={(event) => setLastName(event.target.value)}
        placeholder="Como aparece en tu documento"
        autoComplete="family-name"
      />

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
      {message && (
        <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-[var(--c-text-2)]'}`}>
          {message}
        </p>
      )}
      <SaveButton
        status={buttonStatus}
        onClick={() => {
          saveNow()
          saveIdentityNow()
        }}
        idleLabel="Guardado"
        savedLabel="Datos guardados"
        className="self-start sm:self-auto"
      />
    </ProfileSection>
  )
}
