'use client'
import { useEffect, useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import ProfileSection from './ProfileSection'
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setDraft(value || {}), [value])

  const verification = draft.identityVerification || {
    status: 'not_submitted' as const,
  }

  const uploadIne = (file: File) => {
    setError(null)
    setBusy(true)
    let finished = false

    CoachCRUD.uploadAsset({ file, uid, scope: 'private' }, (_, url) => {
      if (!url || finished) return
      finished = true
      const document: CoachDocument = { url, name: file.name }
      setDraft({
        identityVerification: {
          status: 'pending',
          document,
          submittedAt: Date.now(),
        },
      })
      setBusy(false)
    })

    setTimeout(() => {
      if (finished) return
      finished = true
      setError('No se pudo subir la INE. Intenta de nuevo.')
      setBusy(false)
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

        <div className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {verification.document?.url ? (
              <img
                src={verification.document.url}
                alt="INE subida"
                className="h-28 w-full rounded-[var(--r-sm)] border border-[var(--c-border)] object-cover sm:w-44"
              />
            ) : (
              <div className="flex h-28 w-full items-center justify-center rounded-[var(--r-sm)] border border-dashed border-[var(--c-border)] text-sm text-[var(--c-text-2)] sm:w-44">
                Sin INE
              </div>
            )}

            <div className="flex-1">
              <p className="font-semibold text-[var(--c-ocean)]">INE</p>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">
                {STATUS_COPY[verification.status]}
              </p>
              {verification.document?.name && (
                <p className="mt-2 truncate text-sm text-[var(--c-ocean-mid)]">
                  {verification.document.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[var(--c-ocean-mid)] bg-white px-5 py-6 text-center">
          <span className="font-semibold text-[var(--c-ocean)]">
            {busy ? 'Subiendo INE…' : 'Subir o reemplazar INE'}
          </span>
          <span className="mt-1 text-sm text-[var(--c-text-2)]">
            JPG, PNG o WEBP
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) uploadIne(file)
            }}
          />
        </label>

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
