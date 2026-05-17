# Coach Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the coach-profile stub with an editable coach profile (config-driven skills carta, public media galleries, private verification docs, links, hybrid auto+admin score) plus an athlete-facing read view.

**Architecture:** New `coaches` Firestore collection, doc id = uid (public fields), with a `coaches/{uid}/private/profile` subdoc for admin/owner-only data. `CoachCRUD` singleton (firebase/coaches/main.ts) follows the domain pattern but uses `setDoc` merge by uid (like `firebase/users.js`). Skills schema + score weights live in `CONSTANTS/` (editable). `autoScore` is a pure client function recomputed on every save and stored on the public doc; `effectiveScore = adminScoreOverride ?? autoScore`. Editor = sectioned cards each saving independently. Athlete view reads only the public doc.

**Tech Stack:** Next.js 16 App Router, React 19, Firebase 12 (Firestore + Storage), TypeScript strict, Tailwind v4 + daisyUI v5 (ocean/aqua tokens from `styles/tokens.css`), Playwright e2e, Yarn.

**Spec:** `docs/superpowers/specs/2026-05-16-coach-profile-design.md`

**Codebase constraints (do not violate):**
- No unit test runner. Tests are Playwright e2e in `e2e/*.spec.ts` via `yarn test:e2e`. Auth = Google popup (not automatable) → e2e only covers unauthenticated-observable behavior. Pure logic isolated in `lib/coach-score.ts`, verified by `yarn typecheck` + manual reasoning. **Do not add a unit test framework.**
- `yarn lint` is broken project-wide (ESLint 10, no config — pre-existing). **Do NOT run `yarn lint`.** Gates per task: `yarn typecheck` (+ `yarn build` where stated). Full gate at the end: `yarn typecheck && yarn build && yarn test:e2e`.
- `yarn build` needs env `NEXT_PUBLIC_FIREBASE_CONFIG`. If a build fails ONLY due to missing Firebase env (JSON parse) and not the task's code: set it INLINE for that single command (e.g. `NEXT_PUBLIC_FIREBASE_CONFIG='{}' yarn build`). NEVER create or commit a `.env`/config file.
- Path aliases: `@comps/* → components/*`, `@/* → repo root`, `@context → context/*`, `@firebase/* & fb/* → firebase/*`, `Inputs/* → components/Inputs/*`.
- Firestore/Storage access only via `firebase/*` helpers — never call Firestore from components/pages.
- UI copy is Spanish; route slugs/code English. Use ocean/aqua design tokens (`var(--c-*)`, `var(--r-*)`, `var(--shadow-*)`) consistent with the shipped role shell; keep daisyUI primitive class names.
- Branch is `pre` (already checked out). Commit after every task on `pre`. Do not open a PR.

**Out of scope (do not build):** video-presentación UI (reserved placeholder field only), admin override/verification UI, find-coach search/listing wiring, reviews/ratings, authoring Firestore/Storage security rules.

---

## File Structure

**Create:**
- `CONSTANTS/COACH_SKILLS.js` — carta schema (dimensions + options). One responsibility: skills vocabulary.
- `CONSTANTS/COACH_SCORE.js` — score weights + max. One responsibility: scoring config.
- `lib/coach-score.ts` — pure scoring (`computeAutoScore`, `effectiveScore`). No React/Firebase.
- `firebase/coaches/coach.model.ts` — TS interfaces for public/private/merged shapes.
- `firebase/coaches/coach.dtos.ts` — input DTOs.
- `firebase/coaches/main.ts` — `CoachCRUD` singleton (listen/get/upsert public+private, uploadAsset).
- `components/coach/SkillsCard.tsx` — carta editor (one select per dimension).
- `components/coach/MediaCard.tsx` — face/workplace/achievement photo upload.
- `components/coach/LinksCard.tsx` — socials + youtube links editor.
- `components/coach/PrivateCard.tsx` — private contacts + id docs + certifications (private subdoc).
- `components/coach/ScoreCard.tsx` — read-only autoScore + status display.
- `app/(app)/athlete/coach/[id]/page.tsx` — athlete read view (public doc only).
- `e2e/coach-profile.spec.ts` — route e2e.

**Modify:**
- `app/(app)/coach/coach-profile/page.tsx` — stub → editor composing the cards.
- `CLAUDE.md` — document `coaches` collection + manual admin score/status convention.

---

## Task 1: Skills + score config

**Files:**
- Create: `CONSTANTS/COACH_SKILLS.js`
- Create: `CONSTANTS/COACH_SCORE.js`

- [ ] **Step 1: Create `CONSTANTS/COACH_SKILLS.js`**

```js
// Coach "carta de habilidades" schema. Single source of truth.
// Add/edit a dimension or option here — the editor and athlete view
// render dynamically from this array. One option selected per dimension.
const COACH_SKILLS = [
  {
    key: 'experiencia',
    label: 'Experiencia',
    options: [
      { value: 'principiantes', label: 'Principiantes' },
      { value: 'amateur', label: 'Amateur' },
      { value: 'profesional', label: 'Profesional' },
    ],
  },
  {
    key: 'tiempoEnsenanza',
    label: 'Tiempo de enseñanza',
    options: [
      { value: 'metodica', label: 'Metódica' },
      { value: 'holistica', label: 'Holística' },
      { value: 'mixta', label: 'Mixta' },
    ],
  },
  {
    key: 'metodologia',
    label: 'Metodología',
    options: [
      { value: 'libre', label: 'Libre' },
      { value: 'sensorial', label: 'Sensorial' },
      { value: 'didactica', label: 'Didáctica' },
      { value: 'porObjetivos', label: 'Por objetivos' },
    ],
  },
  {
    key: 'personalidad',
    label: 'Personalidad',
    options: [
      { value: 'firme', label: 'Firme' },
      { value: 'comprensiva', label: 'Comprensiva' },
      { value: 'adaptable', label: 'Adaptable' },
      { value: 'intensa', label: 'Intensa' },
    ],
  },
  {
    key: 'paciencia',
    label: 'Paciencia',
    options: [
      { value: 'poca', label: 'Poca' },
      { value: 'suficientePrincipiantes', label: 'Suficiente para principiantes' },
      { value: 'muchaConMiedo', label: 'Mucha para personas con miedo' },
    ],
  },
]

export default COACH_SKILLS
```

- [ ] **Step 2: Create `CONSTANTS/COACH_SCORE.js`**

```js
// Score weights for autoScore. Retune scoring by editing only this file.
// autoScore = clamp( sum of earned points, 0, MAX ).
const COACH_SCORE = {
  MAX: 100,
  perFilledSkillDimension: 8,   // each carta dimension with a value
  bio: 6,                       // non-empty bio
  facePhoto: 12,                // face photo present
  perWorkplacePhoto: 4,         // each, capped by maxScoredWorkplacePhotos
  maxScoredWorkplacePhotos: 3,
  perAchievementPhoto: 4,       // each, capped by maxScoredAchievementPhotos
  maxScoredAchievementPhotos: 3,
  perIdDocument: 10,            // each, capped by maxScoredIdDocuments
  maxScoredIdDocuments: 1,
  perCertification: 10,         // each, capped by maxScoredCertifications
  maxScoredCertifications: 3,
}

export default COACH_SCORE
```

- [ ] **Step 3: Verify import resolution**

Run: `yarn typecheck`
Expected: PASS (these are plain JS modules with default exports; no TS errors introduced).

- [ ] **Step 4: Commit**

```bash
git add CONSTANTS/COACH_SKILLS.js CONSTANTS/COACH_SCORE.js
git commit -m "feat(coach): skills carta schema + score weight config"
```

---

## Task 2: Pure scoring module

**Files:**
- Create: `lib/coach-score.ts`

- [ ] **Step 1: Create `lib/coach-score.ts`**

```ts
import COACH_SCORE from '@/CONSTANTS/COACH_SCORE'
import COACH_SKILLS from '@/CONSTANTS/COACH_SKILLS'

export interface ScorableProfile {
  skills?: Record<string, string> | null
  bio?: string | null
  facePhoto?: { url: string } | null
  workplacePhotos?: { url: string }[] | null
  achievementPhotos?: { url: string }[] | null
  idDocuments?: { url: string; name: string }[] | null
  certifications?: { url: string; name: string }[] | null
}

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n))

/**
 * Pure: total auto score for a coach profile, integer clamped 0..MAX.
 * Counts only skill dimensions that exist in the current schema.
 */
export function computeAutoScore(
  profile: ScorableProfile,
  weights = COACH_SCORE
): number {
  let pts = 0

  const validKeys = new Set(COACH_SKILLS.map((d) => d.key))
  const skills = profile.skills ?? {}
  for (const key of Object.keys(skills)) {
    if (validKeys.has(key) && skills[key]) pts += weights.perFilledSkillDimension
  }

  if (profile.bio && profile.bio.trim().length > 0) pts += weights.bio
  if (profile.facePhoto?.url) pts += weights.facePhoto

  const wp = profile.workplacePhotos?.length ?? 0
  pts += Math.min(wp, weights.maxScoredWorkplacePhotos) * weights.perWorkplacePhoto

  const ap = profile.achievementPhotos?.length ?? 0
  pts +=
    Math.min(ap, weights.maxScoredAchievementPhotos) *
    weights.perAchievementPhoto

  const idn = profile.idDocuments?.length ?? 0
  pts += Math.min(idn, weights.maxScoredIdDocuments) * weights.perIdDocument

  const cert = profile.certifications?.length ?? 0
  pts +=
    Math.min(cert, weights.maxScoredCertifications) * weights.perCertification

  return clamp(Math.round(pts), 0, weights.MAX)
}

export interface CoachVerification {
  status: 'pending' | 'verified'
  autoScore: number
  adminScoreOverride?: number
}

/** Pure: the score athletes see — admin override wins, else autoScore. */
export function effectiveScore(
  verification: CoachVerification | null | undefined
): number {
  if (!verification) return 0
  return verification.adminScoreOverride ?? verification.autoScore ?? 0
}
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Manual logic check (no unit runner — reason it through)**

Confirm by reading: empty profile → `0`. Profile with all 5 skill dims set + bio + facePhoto = `5*8 + 6 + 12 = 58`. Add 1 id doc (`+10`), 3 certs (`+30`) = `98`. 5 workplace photos counts only 3 (`+12`). Overflow beyond 100 clamps to `100`. Unknown skill key (not in `COACH_SKILLS`) contributes `0`. `effectiveScore({status:'pending',autoScore:40})` → `40`; with `adminScoreOverride:90` → `90`; `null` → `0`.

- [ ] **Step 4: Commit**

```bash
git add lib/coach-score.ts
git commit -m "feat(coach): pure autoScore + effectiveScore helpers"
```

---

## Task 3: Coach domain types

**Files:**
- Create: `firebase/coaches/coach.model.ts`
- Create: `firebase/coaches/coach.dtos.ts`

- [ ] **Step 1: Create `firebase/coaches/coach.model.ts`**

```ts
export interface CoachPhoto {
  url: string
}

export interface CoachSocial {
  type: string
  url: string
}

export interface CoachYoutubeLink {
  url: string
  label?: string
}

export interface CoachPrivateContact {
  type: string
  value: string
}

export interface CoachDocument {
  url: string
  name: string
}

export interface CoachVerification {
  status: 'pending' | 'verified'
  autoScore: number
  adminScoreOverride?: number
}

/** Public document: coaches/{uid} — readable by athletes. */
export interface CoachPublic {
  id?: string
  userId?: string
  skills?: Record<string, string>
  bio?: string
  facePhoto?: CoachPhoto
  workplacePhotos?: CoachPhoto[]
  achievementPhotos?: CoachPhoto[]
  socials?: CoachSocial[]
  youtubeLinks?: CoachYoutubeLink[]
  // Reserved, no UI in this scope:
  presentationVideo?: { kind: 'youtube' | 'upload'; value: string }
  verification?: CoachVerification
  createdAt?: number
  updatedAt?: number
}

/** Private subdoc: coaches/{uid}/private/profile — admin/owner only. */
export interface CoachPrivate {
  id?: string
  privateContacts?: CoachPrivateContact[]
  idDocuments?: CoachDocument[]
  certifications?: CoachDocument[]
  adminNotes?: string
  updatedAt?: number
}
```

- [ ] **Step 2: Create `firebase/coaches/coach.dtos.ts`**

```ts
import type { CoachPublic, CoachPrivate } from './coach.model'

export type UpsertCoachPublicDto = Partial<
  Omit<CoachPublic, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>

export type UpsertCoachPrivateDto = Partial<
  Omit<CoachPrivate, 'id' | 'updatedAt'>
>
```

- [ ] **Step 3: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add firebase/coaches/coach.model.ts firebase/coaches/coach.dtos.ts
git commit -m "feat(coach): coach public/private domain types + dtos"
```

---

## Task 4: CoachCRUD firebase layer

**Files:**
- Create: `firebase/coaches/main.ts`

- [ ] **Step 1: Create `firebase/coaches/main.ts`**

```ts
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { Dates } from 'firebase-dates-util'
import { db } from '@/firebase/index'
import { FirebaseCRUD } from '@/firebase/FirebaseCRUD'
import type { CoachPublic, CoachPrivate } from './coach.model'
import type {
  UpsertCoachPublicDto,
  UpsertCoachPrivateDto,
} from './coach.dtos'

const publicRef = (uid: string) => doc(db, 'coaches', uid)
const privateRef = (uid: string) => doc(db, 'coaches', uid, 'private', 'profile')

export class Coach {
  listenPublic(uid: string, cb: (doc: CoachPublic | null) => void) {
    return onSnapshot(publicRef(uid), (snap) =>
      cb(FirebaseCRUD.normalizeDoc(snap) as CoachPublic | null)
    )
  }

  async getPublic(uid: string): Promise<CoachPublic | null> {
    const snap = await getDoc(publicRef(uid))
    return FirebaseCRUD.normalizeDoc(snap) as CoachPublic | null
  }

  async upsertPublic(uid: string, partial: UpsertCoachPublicDto) {
    const snap = await getDoc(publicRef(uid))
    const base: Record<string, unknown> = {
      ...partial,
      userId: uid,
      updatedAt: new Date(),
    }
    if (!snap.exists()) base.createdAt = new Date()
    const payload = Dates.deepFormatObjectDates(base, 'number')
    return setDoc(publicRef(uid), payload, { merge: true })
  }

  listenPrivate(uid: string, cb: (doc: CoachPrivate | null) => void) {
    return onSnapshot(privateRef(uid), (snap) =>
      cb(FirebaseCRUD.normalizeDoc(snap) as CoachPrivate | null)
    )
  }

  async upsertPrivate(uid: string, partial: UpsertCoachPrivateDto) {
    const payload = Dates.deepFormatObjectDates(
      { ...partial, updatedAt: new Date() },
      'number'
    )
    return setDoc(privateRef(uid), payload, { merge: true })
  }

  /**
   * Upload a coach asset. scope decides the storage path prefix so
   * Storage rules can lock down private assets separately.
   */
  uploadAsset(
    {
      file,
      uid,
      scope,
    }: { file: Blob; uid: string; scope: 'public' | 'private' },
    cb: (progress: number, downloadURL: string | null) => void
  ) {
    const fieldName =
      scope === 'public' ? `coach-public/${uid}` : `coach-private/${uid}`
    return FirebaseCRUD.uploadFile({ file, fieldName }, cb)
  }
}

export const CoachCRUD = new Coach()
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS. (`@/firebase/index` exports `db`; `FirebaseCRUD` exports `normalizeDoc` and static `uploadFile` — confirmed in `firebase/FirebaseCRUD.ts`.)

- [ ] **Step 3: Commit**

```bash
git add firebase/coaches/main.ts
git commit -m "feat(coach): CoachCRUD (public/private upsert+listen, scoped uploadAsset)"
```

---

## Task 5: SkillsCard

**Files:**
- Create: `components/coach/SkillsCard.tsx`

- [ ] **Step 1: Create `components/coach/SkillsCard.tsx`**

```tsx
'use client'
import { useState } from 'react'
import COACH_SKILLS from '@/CONSTANTS/COACH_SKILLS'

export default function SkillsCard({
  value,
  saving,
  onSave,
}: {
  value: Record<string, string>
  saving: boolean
  onSave: (skills: Record<string, string>) => void
}) {
  const [draft, setDraft] = useState<Record<string, string>>(value || {})

  return (
    <section className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
        Carta de habilidades
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {COACH_SKILLS.map((dim) => (
          <label key={dim.key} className="form-control">
            <span className="label-text text-[var(--c-text-2)]">
              {dim.label}
            </span>
            <select
              className="select select-bordered"
              value={draft[dim.key] || ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [dim.key]: e.target.value }))
              }
            >
              <option value="">—</option>
              {dim.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(draft)}
        className="btn btn-primary self-start disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar carta'}
      </button>
    </section>
  )
}
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/SkillsCard.tsx
git commit -m "feat(coach): SkillsCard carta editor (schema-driven selects)"
```

---

## Task 6: MediaCard

**Files:**
- Create: `components/coach/MediaCard.tsx`

- [ ] **Step 1: Create `components/coach/MediaCard.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import type { CoachPhoto } from '@/firebase/coaches/coach.model'

interface MediaValue {
  facePhoto?: CoachPhoto
  workplacePhotos?: CoachPhoto[]
  achievementPhotos?: CoachPhoto[]
}

export default function MediaCard({
  uid,
  value,
  saving,
  onSave,
}: {
  uid: string
  value: MediaValue
  saving: boolean
  onSave: (v: MediaValue) => void
}) {
  const [draft, setDraft] = useState<MediaValue>(value || {})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = (file: File, apply: (url: string) => void, tag: string) => {
    setError(null)
    setBusy(tag)
    CoachCRUD.uploadAsset({ file, uid, scope: 'public' }, (p, url) => {
      if (url) {
        apply(url)
        setBusy(null)
      }
    })
    // Surface a hard failure if the upload never reports a URL.
    setTimeout(() => {
      setBusy((b) => {
        if (b === tag) setError('No se pudo subir la imagen. Intenta de nuevo.')
        return b === tag ? null : b
      })
    }, 30000)
  }

  return (
    <section className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
        Fotos
      </h2>
      {error && <p className="text-[var(--c-error,#b91c1c)] text-sm">{error}</p>}

      <div className="flex flex-col gap-2">
        <span className="label-text text-[var(--c-text-2)]">
          Foto de tu cara
        </span>
        {draft.facePhoto?.url && (
          <img
            src={draft.facePhoto.url}
            alt="Foto de cara"
            className="w-24 h-24 object-cover rounded-full border border-[var(--c-border)]"
          />
        )}
        <input
          type="file"
          accept="image/*"
          className="file-input file-input-bordered"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f)
              upload(
                f,
                (url) => setDraft((d) => ({ ...d, facePhoto: { url } })),
                'face'
              )
          }}
        />
      </div>

      <MultiPhoto
        label="Lugares de trabajo"
        photos={draft.workplacePhotos || []}
        busy={busy === 'workplace'}
        onAdd={(f) =>
          upload(
            f,
            (url) =>
              setDraft((d) => ({
                ...d,
                workplacePhotos: [...(d.workplacePhotos || []), { url }],
              })),
            'workplace'
          )
        }
        onRemove={(i) =>
          setDraft((d) => ({
            ...d,
            workplacePhotos: (d.workplacePhotos || []).filter(
              (_, idx) => idx !== i
            ),
          }))
        }
      />

      <MultiPhoto
        label="Logros"
        photos={draft.achievementPhotos || []}
        busy={busy === 'achievement'}
        onAdd={(f) =>
          upload(
            f,
            (url) =>
              setDraft((d) => ({
                ...d,
                achievementPhotos: [...(d.achievementPhotos || []), { url }],
              })),
            'achievement'
          )
        }
        onRemove={(i) =>
          setDraft((d) => ({
            ...d,
            achievementPhotos: (d.achievementPhotos || []).filter(
              (_, idx) => idx !== i
            ),
          }))
        }
      />

      <button
        type="button"
        disabled={saving || !!busy}
        onClick={() => onSave(draft)}
        className="btn btn-primary self-start disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar fotos'}
      </button>
    </section>
  )
}

function MultiPhoto({
  label,
  photos,
  busy,
  onAdd,
  onRemove,
}: {
  label: string
  photos: CoachPhoto[]
  busy: boolean
  onAdd: (f: File) => void
  onRemove: (i: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-text text-[var(--c-text-2)]">{label}</span>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p.url + i} className="relative">
            <img
              src={p.url}
              alt={label}
              className="w-20 h-20 object-cover rounded-[var(--r-sm)] border border-[var(--c-border)]"
            />
            <button
              type="button"
              aria-label="Quitar"
              onClick={() => onRemove(i)}
              className="absolute -top-2 -right-2 bg-[var(--c-ocean)] text-white rounded-full w-5 h-5 text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        className="file-input file-input-bordered"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onAdd(f)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/MediaCard.tsx
git commit -m "feat(coach): MediaCard face/workplace/achievement photo upload"
```

---

## Task 7: LinksCard

**Files:**
- Create: `components/coach/LinksCard.tsx`

- [ ] **Step 1: Create `components/coach/LinksCard.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type {
  CoachSocial,
  CoachYoutubeLink,
} from '@/firebase/coaches/coach.model'

interface LinksValue {
  bio?: string
  socials?: CoachSocial[]
  youtubeLinks?: CoachYoutubeLink[]
}

export default function LinksCard({
  value,
  saving,
  onSave,
}: {
  value: LinksValue
  saving: boolean
  onSave: (v: LinksValue) => void
}) {
  const [draft, setDraft] = useState<LinksValue>(value || {})

  const socials = draft.socials || []
  const yts = draft.youtubeLinks || []

  return (
    <section className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
        Presentación y enlaces
      </h2>

      <label className="form-control">
        <span className="label-text text-[var(--c-text-2)]">Bio</span>
        <textarea
          className="textarea textarea-bordered"
          rows={3}
          value={draft.bio || ''}
          onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="label-text text-[var(--c-text-2)]">Redes sociales</span>
        {socials.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input input-bordered w-1/3"
              placeholder="Tipo (instagram…)"
              value={s.type}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.socials || [])]
                  next[i] = { ...next[i], type: e.target.value }
                  return { ...d, socials: next }
                })
              }
            />
            <input
              className="input input-bordered flex-1"
              placeholder="URL"
              value={s.url}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.socials || [])]
                  next[i] = { ...next[i], url: e.target.value }
                  return { ...d, socials: next }
                })
              }
            />
            <button
              type="button"
              aria-label="Quitar red"
              className="btn btn-ghost"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  socials: (d.socials || []).filter((_, idx) => idx !== i),
                }))
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost self-start"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              socials: [...(d.socials || []), { type: '', url: '' }],
            }))
          }
        >
          + Agregar red
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label-text text-[var(--c-text-2)]">
          Videos de YouTube
        </span>
        {yts.map((y, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input input-bordered flex-1"
              placeholder="URL de YouTube"
              value={y.url}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.youtubeLinks || [])]
                  next[i] = { ...next[i], url: e.target.value }
                  return { ...d, youtubeLinks: next }
                })
              }
            />
            <input
              className="input input-bordered w-1/3"
              placeholder="Etiqueta (opcional)"
              value={y.label || ''}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.youtubeLinks || [])]
                  next[i] = { ...next[i], label: e.target.value }
                  return { ...d, youtubeLinks: next }
                })
              }
            />
            <button
              type="button"
              aria-label="Quitar video"
              className="btn btn-ghost"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  youtubeLinks: (d.youtubeLinks || []).filter(
                    (_, idx) => idx !== i
                  ),
                }))
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost self-start"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              youtubeLinks: [...(d.youtubeLinks || []), { url: '', label: '' }],
            }))
          }
        >
          + Agregar video
        </button>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(draft)}
        className="btn btn-primary self-start disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar enlaces'}
      </button>
    </section>
  )
}
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/LinksCard.tsx
git commit -m "feat(coach): LinksCard bio + socials + youtube editor"
```

---

## Task 8: PrivateCard

**Files:**
- Create: `components/coach/PrivateCard.tsx`

- [ ] **Step 1: Create `components/coach/PrivateCard.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import type {
  CoachPrivateContact,
  CoachDocument,
} from '@/firebase/coaches/coach.model'

interface PrivateValue {
  privateContacts?: CoachPrivateContact[]
  idDocuments?: CoachDocument[]
  certifications?: CoachDocument[]
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
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadDoc = (
    file: File,
    apply: (doc: CoachDocument) => void,
    tag: string
  ) => {
    setError(null)
    setBusy(tag)
    CoachCRUD.uploadAsset({ file, uid, scope: 'private' }, (p, url) => {
      if (url) {
        apply({ url, name: file.name })
        setBusy(null)
      }
    })
    setTimeout(() => {
      setBusy((b) => {
        if (b === tag) setError('No se pudo subir el archivo. Intenta de nuevo.')
        return b === tag ? null : b
      })
    }, 30000)
  }

  const contacts = draft.privateContacts || []

  return (
    <section className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
          Verificación (privado)
        </h2>
        <p className="text-sm text-[var(--c-text-2)]">
          Solo para verificación. No visible para atletas.
        </p>
      </div>
      {error && <p className="text-[var(--c-error,#b91c1c)] text-sm">{error}</p>}

      <div className="flex flex-col gap-2">
        <span className="label-text text-[var(--c-text-2)]">
          Contactos privados
        </span>
        {contacts.map((c, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input input-bordered w-1/3"
              placeholder="Tipo (whatsapp…)"
              value={c.type}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.privateContacts || [])]
                  next[i] = { ...next[i], type: e.target.value }
                  return { ...d, privateContacts: next }
                })
              }
            />
            <input
              className="input input-bordered flex-1"
              placeholder="Valor"
              value={c.value}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.privateContacts || [])]
                  next[i] = { ...next[i], value: e.target.value }
                  return { ...d, privateContacts: next }
                })
              }
            />
            <button
              type="button"
              aria-label="Quitar contacto"
              className="btn btn-ghost"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  privateContacts: (d.privateContacts || []).filter(
                    (_, idx) => idx !== i
                  ),
                }))
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost self-start"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              privateContacts: [
                ...(d.privateContacts || []),
                { type: '', value: '' },
              ],
            }))
          }
        >
          + Agregar contacto
        </button>
      </div>

      <DocList
        label="Documentos de identificación"
        docs={draft.idDocuments || []}
        busy={busy === 'id'}
        onAdd={(f) =>
          uploadDoc(
            f,
            (doc) =>
              setDraft((d) => ({
                ...d,
                idDocuments: [...(d.idDocuments || []), doc],
              })),
            'id'
          )
        }
        onRemove={(i) =>
          setDraft((d) => ({
            ...d,
            idDocuments: (d.idDocuments || []).filter((_, idx) => idx !== i),
          }))
        }
      />

      <DocList
        label="Certificaciones"
        docs={draft.certifications || []}
        busy={busy === 'cert'}
        onAdd={(f) =>
          uploadDoc(
            f,
            (doc) =>
              setDraft((d) => ({
                ...d,
                certifications: [...(d.certifications || []), doc],
              })),
            'cert'
          )
        }
        onRemove={(i) =>
          setDraft((d) => ({
            ...d,
            certifications: (d.certifications || []).filter(
              (_, idx) => idx !== i
            ),
          }))
        }
      />

      <button
        type="button"
        disabled={saving || !!busy}
        onClick={() => onSave(draft)}
        className="btn btn-primary self-start disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar verificación'}
      </button>
    </section>
  )
}

function DocList({
  label,
  docs,
  busy,
  onAdd,
  onRemove,
}: {
  label: string
  docs: CoachDocument[]
  busy: boolean
  onAdd: (f: File) => void
  onRemove: (i: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-text text-[var(--c-text-2)]">{label}</span>
      <ul className="flex flex-col gap-1">
        {docs.map((doc, i) => (
          <li
            key={doc.url + i}
            className="flex items-center justify-between text-sm text-[var(--c-ocean)]"
          >
            <span className="truncate">{doc.name}</span>
            <button
              type="button"
              aria-label="Quitar documento"
              className="btn btn-ghost btn-xs"
              onClick={() => onRemove(i)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        type="file"
        disabled={busy}
        className="file-input file-input-bordered"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onAdd(f)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/PrivateCard.tsx
git commit -m "feat(coach): PrivateCard contacts + id docs + certifications (private)"
```

---

## Task 9: ScoreCard

**Files:**
- Create: `components/coach/ScoreCard.tsx`

- [ ] **Step 1: Create `components/coach/ScoreCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/ScoreCard.tsx
git commit -m "feat(coach): ScoreCard read-only score + verification status"
```

---

## Task 10: Editor page (compose cards + recompute autoScore)

**Files:**
- Modify: `app/(app)/coach/coach-profile/page.tsx`

- [ ] **Step 1: Replace `app/(app)/coach/coach-profile/page.tsx` entirely**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { CoachCRUD } from '@/firebase/coaches/main'
import { computeAutoScore } from '@/lib/coach-score'
import type {
  CoachPublic,
  CoachPrivate,
  CoachVerification,
} from '@/firebase/coaches/coach.model'
import SkillsCard from '@comps/coach/SkillsCard'
import MediaCard from '@comps/coach/MediaCard'
import LinksCard from '@comps/coach/LinksCard'
import PrivateCard from '@comps/coach/PrivateCard'
import ScoreCard from '@comps/coach/ScoreCard'
import Loading from '@comps/Loading'

export default function CoachProfilePage() {
  const { user } = useUser() as { user: any }
  const uid = user?.uid || user?.id
  const [pub, setPub] = useState<CoachPublic | null | undefined>(undefined)
  const [priv, setPriv] = useState<CoachPrivate | null | undefined>(undefined)
  const [savingSection, setSavingSection] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return
    const u1 = CoachCRUD.listenPublic(uid, setPub)
    const u2 = CoachCRUD.listenPrivate(uid, setPriv)
    return () => {
      u1 && u1()
      u2 && u2()
    }
  }, [uid])

  if (!uid || pub === undefined || priv === undefined) return <Loading />

  const pubVal = pub || {}
  const privVal = priv || {}

  // Recompute autoScore from the FULL profile (public completeness +
  // private doc counts) and persist it on the public doc, preserving
  // status + admin override.
  const recomputeScore = (
    nextPub: CoachPublic,
    nextPriv: CoachPrivate
  ): CoachVerification => {
    const autoScore = computeAutoScore({
      skills: nextPub.skills,
      bio: nextPub.bio,
      facePhoto: nextPub.facePhoto,
      workplacePhotos: nextPub.workplacePhotos,
      achievementPhotos: nextPub.achievementPhotos,
      idDocuments: nextPriv.idDocuments,
      certifications: nextPriv.certifications,
    })
    const prev = nextPub.verification
    return {
      status: prev?.status ?? 'pending',
      autoScore,
      ...(prev?.adminScoreOverride !== undefined
        ? { adminScoreOverride: prev.adminScoreOverride }
        : {}),
    }
  }

  const savePublic = async (
    section: string,
    partial: Partial<CoachPublic>
  ) => {
    setSavingSection(section)
    const merged: CoachPublic = { ...pubVal, ...partial }
    const verification = recomputeScore(merged, privVal)
    await CoachCRUD.upsertPublic(uid, { ...partial, verification })
    setSavingSection(null)
  }

  const savePrivate = async (
    section: string,
    partial: Partial<CoachPrivate>
  ) => {
    setSavingSection(section)
    const mergedPriv: CoachPrivate = { ...privVal, ...partial }
    const verification = recomputeScore(pubVal, mergedPriv)
    await CoachCRUD.upsertPrivate(uid, partial)
    await CoachCRUD.upsertPublic(uid, { verification })
    setSavingSection(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Mi perfil de coach</h1>

      <ScoreCard verification={pubVal.verification} />

      <SkillsCard
        value={pubVal.skills || {}}
        saving={savingSection === 'skills'}
        onSave={(skills) => savePublic('skills', { skills })}
      />

      <MediaCard
        uid={uid}
        value={{
          facePhoto: pubVal.facePhoto,
          workplacePhotos: pubVal.workplacePhotos,
          achievementPhotos: pubVal.achievementPhotos,
        }}
        saving={savingSection === 'media'}
        onSave={(v) => savePublic('media', v)}
      />

      <LinksCard
        value={{
          bio: pubVal.bio,
          socials: pubVal.socials,
          youtubeLinks: pubVal.youtubeLinks,
        }}
        saving={savingSection === 'links'}
        onSave={(v) => savePublic('links', v)}
      />

      <PrivateCard
        uid={uid}
        value={{
          privateContacts: privVal.privateContacts,
          idDocuments: privVal.idDocuments,
          certifications: privVal.certifications,
        }}
        saving={savingSection === 'private'}
        onSave={(v) => savePrivate('private', v)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify types + build**

Run: `yarn typecheck && yarn build`
Expected: PASS. `/coach/coach-profile` still listed. (If build fails ONLY for missing Firebase env, set it inline for that one command; never commit a config file.)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/coach/coach-profile/page.tsx"
git commit -m "feat(coach): coach-profile editor composing cards + autoScore recompute"
```

---

## Task 11: Athlete read view

**Files:**
- Create: `app/(app)/athlete/coach/[id]/page.tsx`

- [ ] **Step 1: Create `app/(app)/athlete/coach/[id]/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify types + build**

Run: `yarn typecheck && yarn build`
Expected: PASS, `/athlete/coach/[id]` appears as a dynamic route. (Inline Firebase env for the build only if needed; never commit it.)

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/athlete/coach/[id]/page.tsx"
git commit -m "feat(coach): athlete read view (public doc only, score + chips + galleries)"
```

---

## Task 12: e2e + docs + final gates

**Files:**
- Create: `e2e/coach-profile.spec.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write the e2e spec**

`e2e/coach-profile.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('athlete coach view shows "Perfil no disponible" for unknown id', async ({
  page,
}) => {
  await page.goto('/athlete/coach/__nonexistent__')
  // Either the not-found message renders, or AuthGate bounces an
  // unauthenticated visitor to /login — both prove the route resolved.
  await expect(
    page.getByText('Perfil no disponible').or(page.locator('body'))
  ).toBeVisible()
  await expect(page).toHaveURL(/\/athlete\/coach\/__nonexistent__|\/login/)
})
```

- [ ] **Step 2: Run the new spec**

Read `playwright.config.*` and `e2e/smoke.spec.ts` to learn how the suite boots its server (webServer/baseURL; reuse the same env approach smoke uses — never create/commit a config file). Then run:
Run: `yarn test:e2e e2e/coach-profile.spec.ts`
Expected: 1 passed. If the server cannot boot for environment reasons unrelated to this code (and smoke also cannot), report DONE_WITH_CONCERNS and confirm the route + not-found branch exist by inspection.

- [ ] **Step 3: Document in `CLAUDE.md`**

Read `CLAUDE.md`. In the `### Firebase data layer — the central pattern` section, append this bullet at the end of that section (preserve everything else exactly):
```markdown
- Coach profiles: `coaches/{uid}` (public, athlete-readable) + `coaches/{uid}/private/profile` subdoc (admin/owner only — IDs, certifications, private contacts). `firebase/coaches/main.ts` exports `CoachCRUD` (setDoc-merge by uid, not addDoc). Skills schema = `CONSTANTS/COACH_SKILLS.js`; score weights = `CONSTANTS/COACH_SCORE.js`; `lib/coach-score.ts` computes `autoScore` (recomputed client-side on every save, stored on the public doc). `effectiveScore = verification.adminScoreOverride ?? verification.autoScore`. **`verification.status` and `verification.adminScoreOverride` are set manually in Firestore — no admin UI (same convention as the manual admin-role grant).** True private-data enforcement requires Firestore/Storage security rules configured in the Firebase console (out of repo).
```

- [ ] **Step 4: Final gates**

Run: `yarn typecheck && yarn build && yarn test:e2e`
Expected: typecheck PASS; build PASS (`/coach/coach-profile`, `/athlete/coach/[id]` present); e2e all PASS (smoke + role-shell redirects + this spec). Do NOT run `yarn lint` (broken project-wide; out of scope).

- [ ] **Step 5: Commit**

```bash
git add e2e/coach-profile.spec.ts CLAUDE.md
git commit -m "test(e2e): coach view route; docs: coaches collection + scoring convention"
```

---

## Self-Review

**Spec coverage:**
- §1 data model (public doc + private subdoc) → Task 3 (types), Task 4 (CRUD paths `coaches/{uid}` + `coaches/{uid}/private/profile`).
- §2 config (COACH_SKILLS single-select schema, COACH_SCORE weights) → Task 1; consumed Tasks 2/5/11.
- §3 hybrid scoring (autoScore from weights, effectiveScore = override ?? auto, recompute on save, admin manual) → Task 2 (pure), Task 10 (recompute+persist), Task 12 (CLAUDE.md convention).
- §4 firebase layer (CoachCRUD uid doc-id, listen/get/upsert public+private, scoped uploadAsset) → Task 4.
- §5 UI (sectioned editor cards saving independently; athlete read = public only) → Tasks 5–10 (editor) + Task 11 (athlete view, listens public only, never imports private).
- §6 edge cases (no doc → Loading/"no disponible", upload failure inline error, unknown skill key ignored, score clamped, non-coach via RoleGuard) → Task 2 (clamp/unknown key), Task 6/8 (upload error + timeout), Task 10 (Loading), Task 11 (null → "Perfil no disponible"); RoleGuard already in `coach/layout.tsx` (shipped).
- §7 security assumption → documented in Task 12 CLAUDE.md bullet; data split implemented Tasks 3/4.
- §8 testing → Task 12 e2e + typecheck/build gates each task.
- §9 out of scope → no video-presentación UI (only reserved `presentationVideo` field in type, Task 3); no admin UI; no search wiring. Respected.

**Placeholder scan:** No "TBD/handle errors/similar to Task N". Every code step is complete. Upload error handling is concrete (busy tag + 30s timeout + inline message), not a vague "add error handling".

**Type consistency:** `CoachPublic`/`CoachPrivate`/`CoachVerification`/`CoachPhoto`/`CoachSocial`/`CoachYoutubeLink`/`CoachPrivateContact`/`CoachDocument` defined in Task 3, used unchanged in Tasks 4/5/6/7/8/9/10/11. `CoachCRUD` methods (`listenPublic`,`getPublic`,`upsertPublic`,`listenPrivate`,`upsertPrivate`,`uploadAsset`) defined Task 4, called with matching signatures in Tasks 6/8/10/11. `computeAutoScore(ScorableProfile)`/`effectiveScore(CoachVerification)` from Task 2 used consistently in Tasks 9/10/11. Storage scope `'public'|'private'` consistent. `CONSTANTS/COACH_SKILLS` default export shape `{key,label,options:[{value,label}]}` consistent across Tasks 1/2/5/11. Note: Task 2 imports `CoachVerification` independently in `lib/coach-score.ts` (pure, no firebase import) and Task 3 declares the same shape in `coach.model.ts`; `ScoreCard`/editor use the model's type — structurally identical (both `{status,autoScore,adminScoreOverride?}`); intentional to keep `lib/` free of firebase imports.
