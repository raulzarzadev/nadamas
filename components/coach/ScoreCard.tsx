'use client'

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
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
              verified ? 'bg-[#1d4ed8] text-white' : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
            }`}
          >
            {verified ? '✓ Verificado' : 'Pendiente de verificación'}
          </span>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-[var(--c-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-[var(--c-ocean)]">Perfil visible en el marketplace</p>
            <p className="mt-1 text-sm text-[var(--c-text-2)]">
              {visible
                ? 'Tu perfil aparece y es buscable. La verificación añade una palomita azul de garantía; sin ella no podemos asegurar tu visibilidad.'
                : 'Tu perfil está oculto: no aparece ni es buscable en el marketplace.'}
            </p>
          </div>
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="toggle"
              checked={visible}
              disabled={togglingVisible}
              onChange={(event) => onToggleVisible(event.target.checked)}
            />
            <span className="text-sm font-semibold text-[var(--c-text-2)]">
              {visible ? 'Visible' : 'Oculto'}
            </span>
          </label>
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
