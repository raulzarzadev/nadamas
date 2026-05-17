'use client'
import { use, useEffect, useState } from 'react'
import COACH_SKILLS from '@/CONSTANTS/COACH_SKILLS'
import { CoachCRUD } from '@/firebase/coaches/main'
import { effectiveScore } from '@/lib/coach-score'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import Loading from '@comps/Loading'

function skillLabel(dimKey: string, value: string): string | null {
  const dim = COACH_SKILLS.find((d) => d.key === dimKey)
  if (!dim) return null
  const opt = dim.options.find((o) => o.value === value)
  return opt ? `${dim.label}: ${opt.label}` : null
}

export default function AthleteCoachView({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [coach, setCoach] = useState<CoachPublic | null | undefined>(undefined)

  useEffect(() => {
    const unsub = CoachCRUD.listenPublic(id, setCoach)
    return () => {
      unsub && unsub()
    }
  }, [id])

  if (coach === undefined) return <Loading />
  if (coach === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Coach</h1>
        <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
          Perfil no disponible
        </div>
      </div>
    )
  }

  const verified = coach.verification?.status === 'verified'
  const score = effectiveScore(coach.verification)
  const chips = Object.entries(coach.skills || {})
    .map(([k, v]) => skillLabel(k, v))
    .filter((x): x is string => !!x)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        {coach.facePhoto?.url && (
          <img
            src={coach.facePhoto.url}
            alt="Coach"
            className="w-20 h-20 object-cover rounded-full border border-[var(--c-border)]"
          />
        )}
        <div>
          <p className="text-3xl font-extrabold text-[var(--c-ocean)]">
            {score}
            <span className="text-base font-medium text-[var(--c-text-2)]">
              {' '}
              / 100
            </span>
          </p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
              verified
                ? 'bg-[var(--c-aqua-light)] text-[var(--c-ocean)]'
                : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
            }`}
          >
            {verified ? 'Verificado' : 'Pendiente de verificación'}
          </span>
        </div>
      </header>

      {coach.bio && (
        <p className="text-[var(--c-text-2)]">{coach.bio}</p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full bg-[var(--c-surface)] border border-[var(--c-border)] px-3 py-1 text-sm text-[var(--c-ocean)]"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {(coach.workplacePhotos?.length || coach.achievementPhotos?.length) && (
        <div className="flex flex-wrap gap-3">
          {[
            ...(coach.workplacePhotos || []),
            ...(coach.achievementPhotos || []),
          ].map((p, i) => (
            <img
              key={p.url + i}
              src={p.url}
              alt="Galería del coach"
              className="w-28 h-28 object-cover rounded-[var(--r-md)] border border-[var(--c-border)]"
            />
          ))}
        </div>
      )}

      {!!coach.youtubeLinks?.length && (
        <ul className="flex flex-col gap-1">
          {coach.youtubeLinks.map((y, i) => (
            <li key={y.url + i}>
              <a
                href={y.url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--c-aqua-strong)] font-semibold underline"
              >
                {y.label || y.url}
              </a>
            </li>
          ))}
        </ul>
      )}

      {!!coach.socials?.length && (
        <ul className="flex flex-wrap gap-3">
          {coach.socials.map((s, i) => (
            <li key={s.url + i}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--c-aqua-strong)] font-semibold underline"
              >
                {s.type || s.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
