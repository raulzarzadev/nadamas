'use client'

import { FiEye, FiEyeOff } from 'react-icons/fi'
import type { CoachIdentityVerification, CoachVerification } from '@/firebase/coaches/coach.model'

export default function ScoreCard({
  verification,
  identityStatus = 'not_submitted',
  missingItems,
  onRequestVerification,
  requesting,
  requestError,
  visible,
  onToggleVisible,
  togglingVisible,
}: {
  verification?: CoachVerification
  identityStatus?: CoachIdentityVerification['status']
  missingItems: string[]
  onRequestVerification: () => void
  requesting: boolean
  requestError?: string | null
  visible: boolean
  onToggleVisible: (next: boolean) => void
  togglingVisible?: boolean
}) {
  const verified = verification?.status === 'verified'
  const completionDone = missingItems.length === 0

  return (
    <div>
      <section className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-xl font-bold text-[var(--c-ocean-mid)]">Estado del perfil</h2>

          <button
            type="button"
            disabled={togglingVisible}
            onClick={() => onToggleVisible(!visible)}
            aria-pressed={visible}
            title={
              visible
                ? 'Tu perfil aparece y es buscable. La verificación añade la palomita azul de garantía.'
                : 'Tu perfil está oculto: no aparece en el marketplace.'
            }
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition disabled:opacity-50 ${
              visible
                ? 'bg-[var(--c-aqua-light)] text-[var(--c-ocean)] hover:bg-[var(--c-aqua)] hover:text-white'
                : 'bg-[var(--c-surface)] text-[var(--c-text-2)] hover:bg-[var(--c-border)]'
            }`}
          >
            {visible ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
            {visible ? 'Visible' : 'Oculto'}
          </button>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
              verified ? 'bg-[#1d4ed8] text-white' : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
            }`}
          >
            {verified ? '✓ Verificado' : 'Pendiente de verificación'}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--c-text-2)]">
            {completionDone
              ? 'Tu perfil ya tiene lo esencial. Puedes enviarlo a revisión.'
              : `Completa estos ${missingItems.length} requisitos para poder solicitar verificación:`}
          </p>

          {!verified && (
            <button
              type="button"
              disabled={requesting || !completionDone}
              onClick={onRequestVerification}
              title={
                completionDone
                  ? undefined
                  : 'Completa todos los requisitos para solicitar verificación'
              }
              className="btn btn-outline btn-sm self-start disabled:opacity-50 sm:self-auto"
            >
              {requesting
                ? 'Enviando…'
                : identityStatus === 'pending'
                  ? 'Reenviar solicitud'
                  : 'Solicitar verificación'}
            </button>
          )}
        </div>

        {requestError && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{requestError}</p>
        )}

        {!completionDone && (
          <ul className="flex flex-wrap gap-2">
            {missingItems.map((item) => (
              <li
                key={item}
                className="rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm text-[var(--c-text-2)]"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
