'use client'
import type { CoachVerification } from '@/firebase/coaches/coach.model'
import { effectiveScore } from '@/lib/coach-score'

export default function ScoreCard({
  verification,
}: {
  verification?: CoachVerification
}) {
  const status = verification?.status ?? 'pending'
  const score = effectiveScore(verification)
  const verified = status === 'verified'

  return (
    <section className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-2">
      <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
        Tu calificación
      </h2>
      <p className="text-4xl font-extrabold text-[var(--c-ocean)]">
        {score}
        <span className="text-base font-medium text-[var(--c-text-2)]">
          {' '}
          / 100
        </span>
      </p>
      <span
        className={`self-start rounded-full px-3 py-1 text-sm font-semibold ${
          verified
            ? 'bg-[var(--c-aqua-light)] text-[var(--c-ocean)]'
            : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
        }`}
      >
        {verified ? 'Verificado' : 'Pendiente de verificación'}
      </span>
      <p className="text-sm text-[var(--c-text-2)]">
        Sube documentos y completa tu perfil para subir tu puntuación. La
        verificación final la realiza el equipo de nadamas.
      </p>
    </section>
  )
}
