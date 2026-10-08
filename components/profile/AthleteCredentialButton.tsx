'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { FiCreditCard, FiRefreshCw } from 'react-icons/fi'
import Avatar from '@/components/ui/avatar'
import Sheet from '@/components/ui/sheet'
import { type AthleteCredential, credentialQrValue } from '@/lib/athlete-identity'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'

export default function AthleteCredentialButton({ profileId }: { profileId?: string }) {
  const [open, setOpen] = useState(false)
  const [credential, setCredential] = useState<AthleteCredential | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmRotation, setConfirmRotation] = useState(false)

  async function load() {
    setOpen(true)
    setLoading(true)
    setCredential(null)
    setError('')
    setConfirmRotation(false)
    try {
      const response = await getAuthed('/api/credentials')
      const payload = (await response.json()) as { credentials: AthleteCredential[] }
      const selected = payload.credentials.find((item) =>
        profileId
          ? item.profileId === profileId && item.profileType === 'additional'
          : item.profileType === 'user'
      )
      if (!selected) throw new Error('credential_unavailable')
      setCredential(selected)
    } catch {
      setError('No pudimos cargar la credencial. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function rotate() {
    setLoading(true)
    setError('')
    try {
      const response = await postAuthed('/api/credentials/rotate', { profileId })
      const payload = (await response.json()) as { credential: AthleteCredential }
      setCredential(payload.credential)
      setConfirmRotation(false)
    } catch {
      setError('No pudimos renovar el QR. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" className="btn btn-outline min-h-11" onClick={() => void load()}>
        <FiCreditCard aria-hidden="true" /> Credencial digital
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label="Credencial digital"
        size="sm"
        closeDisabled={loading}
      >
        <div className="grid gap-4">
          <h2 className="text-xl font-bold text-(--c-ocean)">Credencial digital</h2>
          {loading && !credential && <p role="status">Cargando credencial…</p>}
          {credential && (
            <div className="overflow-hidden rounded-[var(--r-md)] border border-(--c-border) bg-white">
              <div className="flex items-center gap-4 bg-[image:var(--grad-brand)] p-5 text-white">
                <Avatar name={credential.name} src={credential.photoURL} size={64} tone="white" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest">
                    Nadamas · Atleta
                  </p>
                  <h3 className="mt-1 break-words text-xl font-bold">{credential.name}</h3>
                </div>
              </div>
              <div className="grid justify-items-center gap-3 p-5">
                <div className="max-w-full rounded-xl border border-(--c-border) bg-white p-2">
                  <QRCodeSVG
                    value={credentialQrValue(credential.qrToken)}
                    size={216}
                    level="M"
                    marginSize={4}
                    title={`QR de la credencial de ${credential.name}`}
                    className="h-auto max-w-full"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-(--c-text-2)">
                    ID del atleta
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold tracking-[0.18em] text-(--c-ocean)">
                    {credential.numericId}
                  </p>
                </div>
                <p className="text-center text-sm text-(--c-text-2)">
                  Presenta este QR o tu ID para pasar lista.
                </p>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
              {error}
            </p>
          )}
          {error && !credential && (
            <button
              type="button"
              className="btn btn-outline min-h-11"
              disabled={loading}
              onClick={() => void load()}
            >
              Reintentar
            </button>
          )}
          {credential && !confirmRotation && (
            <button
              type="button"
              className="btn btn-ghost min-h-11 text-(--c-text-2)"
              disabled={loading}
              onClick={() => setConfirmRotation(true)}
            >
              <FiRefreshCw aria-hidden="true" /> Renovar QR
            </button>
          )}
          {confirmRotation && (
            <div className="grid gap-3 rounded-[var(--r-sm)] bg-(--c-surface) p-4">
              <p className="text-sm">
                ¿Renovar el QR? El anterior dejará de funcionar. Tu ID y tus asistencias se
                conservarán.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  className="btn btn-outline min-h-11"
                  onClick={() => setConfirmRotation(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="btn btn-primary min-h-11"
                  onClick={() => void rotate()}
                >
                  {loading ? 'Renovando…' : 'Renovar QR'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </>
  )
}
