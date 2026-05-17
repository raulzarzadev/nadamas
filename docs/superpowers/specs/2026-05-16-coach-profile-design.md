# Design — Coach profile

Date: 2026-05-16
Status: Approved (brainstorming)
Branch: `pre`
Builds on: `2026-05-16-app-role-shell-ocean-aqua-design.md` (role shell shipped; `coach/coach-profile` is currently a bare stub).

## Goal

Turn the coach-profile stub into a real, editable coach profile: a structured skills "carta", public image galleries, private verification documents, social/contact/video links, and a hybrid auto+admin verification score that athletes can see.

## Decisions (locked during brainstorming)

- **Score = hybrid.** `autoScore` computed from config weights (Σ filled sections + uploaded docs/certs). `effectiveScore = adminScoreOverride ?? autoScore`. Verification `status: pending | verified`. Athlete sees `effectiveScore` + verified badge. Admin override/status set manually in Firestore for now (no admin UI — same convention as the manual admin-role grant).
- **Carta = CONSTANTS schema, single-select per dimension.** Dimensions + options live in `CONSTANTS/COACH_SKILLS.js`. `coach.skills = { [dimKey]: optionValue }`. Athlete sees chips. Editing/adding dimensions = editing that file (the "centralized, easily editable" requirement).
- **Visibility = public vs admin-only**, enforced by a data split. Public: face/workplace/achievement photos, socials, YouTube links, carta, score, verified status. Admin/owner-only: identification documents, certifications, private contacts, admin notes.
- **Data home = new `coaches` collection** (`firebase/coaches/main.ts`, doc id = uid), following the `FirebaseCRUD` singleton pattern. `users` doc stays lean (roles only).
- **Scope = everything except "video-presentación".** Video-presentación (upload vs YouTube link — undecided) is a placeholder field only, no UI; deferred to last.

## Architecture (Approach A: public doc + private subdoc)

`coaches/{uid}` holds **public** fields only. `coaches/{uid}/private/profile` holds **admin/owner-only** fields. The athlete read path touches **only** the public doc, so the private subdoc can be locked down by Firestore rules and cannot leak through the public doc. (Rejected: single doc with UI-only hiding — privacy would be cosmetic; flat `coachPrivate/{uid}` — subcollection groups ownership better.)

## 1. Data model

`coaches/{uid}` — **PUBLIC**:
```
skills: { [dimKey: string]: string }        // value ∈ COACH_SKILLS[dim].options
bio?: string
facePhoto?: { url: string }
workplacePhotos: { url: string }[]
achievementPhotos: { url: string }[]
socials: { type: string; url: string }[]
youtubeLinks: { url: string; label?: string }[]
presentationVideo?: { kind: 'youtube' | 'upload'; value: string }  // DEFERRED: field reserved, no UI
verification: {
  status: 'pending' | 'verified'
  autoScore: number                          // 0–100, recomputed on save
  adminScoreOverride?: number                 // set manually in Firestore
}
userId: string                               // = uid (doc id)
createdAt: number
updatedAt: number
```

`coaches/{uid}/private/profile` — **ADMIN/owner only**:
```
privateContacts: { type: string; value: string }[]   // phone/whatsapp/email
idDocuments: { url: string; name: string }[]
certifications: { url: string; name: string }[]
adminNotes?: string
updatedAt: number
```

Dates stored/read as numbers via the existing `firebase-dates-util` path (same as `FirebaseCRUD`/`users.js`).

## 2. Configuration (centralized, editable)

- `CONSTANTS/COACH_SKILLS.js` — `[{ key, label, options: [{ value, label }] }]`. Seeded dimensions:
  - `experiencia`: principiantes · amateur · profesional
  - `tiempoEnsenanza`: metódica · holística · mixta
  - `metodologia`: libre · sensorial · didáctica · por objetivos
  - `personalidad`: firme · comprensiva · adaptable · intensa
  - `paciencia`: poca · suficiente para principiantes · mucha para personas con miedo

  Adding/editing a dimension or option = editing only this file. The editor and athlete view render dynamically from it.
- `CONSTANTS/COACH_SCORE.js` — weights: points for each filled carta dimension, `bio`, `facePhoto`, each workplace/achievement photo (capped), each id document, each certification; `MAX = 100`. Retuning scoring = editing only this file.

## 3. Scoring (hybrid, client-computed)

There are no Cloud Functions in this repo (client Firebase SDK only), so scoring is a pure client function.

`lib/coach-score.ts` (pure, no React/Firebase):
- `computeAutoScore(profile, weights)` → integer clamped `0..100`, where `profile` is the merged public+private shape (the coach owns and can read both).
- `effectiveScore(publicDoc)` → `verification.adminScoreOverride ?? verification.autoScore`.

Flow: whenever the coach saves any editor section, the page recomputes `autoScore` from the full profile (public completeness + private doc/cert counts) and writes `verification.autoScore` onto the **public** doc. `adminScoreOverride` and `status` are set manually in Firestore (documented in `CLAUDE.md`, mirroring the admin-role convention). The athlete reads only the public doc and therefore needs no private data to display the score.

## 4. Firebase layer

`firebase/coaches/main.ts` exports a `CoachCRUD` singleton, following the domain pattern (`firebase/<domain>/main.ts`) but with **doc id = uid** (use `setDoc` + merge like `firebase/users.js`, not `addDoc`):
- `listenPublic(uid, cb)` / `getPublic(uid)` / `upsertPublic(uid, partial)` — public doc, injects `updatedAt`, `userId`, `createdAt` on first write.
- `listenPrivate(uid, cb)` / `upsertPrivate(uid, partial)` — `coaches/{uid}/private/profile`.
- `uploadAsset({ file, scope }, cb)` wrapping `FirebaseCRUD.uploadFile`, with `scope: 'public' | 'private'` selecting storage path prefix `coach-public/<uid>/…` vs `coach-private/<uid>/…`.

`coach.model.ts` / `coach.dtos.ts` alongside, matching the existing athletes-domain file layout.

## 5. UI

**Editor — `app/(app)/coach/coach-profile/page.tsx`** (client, behind existing `RoleGuard need="coach"` + `AppChrome`). Sectioned cards in `components/coach/`, each saving independently (partial upsert) so a large media upload never blocks a carta edit:
- `SkillsCard` — one `<select>` per `COACH_SKILLS` dimension; saves `skills`.
- `MediaCard` — face photo (single), workplace photos (multi), achievement photos (multi); uses `uploadAsset` scope `public`; saves photo arrays.
- `LinksCard` — socials list + YouTube links list; saves `socials`/`youtubeLinks`.
- `PrivateCard` — private contacts, id documents, certifications; `uploadAsset` scope `private`; saves to private subdoc. Clearly labeled "Solo para verificación — no visible para atletas".
- `ScoreCard` — read-only: shows `autoScore`, `status` (pendiente/verificado), brief explainer.

Loads via `listenPublic` + `listenPrivate`. Ocean/aqua tokens + daisyUI primitives, consistent with the shipped shell.

**Athlete read — `app/(app)/athlete/coach/[id]/page.tsx`** (client, athlete segment). `listenPublic(id)` **only**. Renders public fields: face photo, galleries, carta as chips (resolved via `COACH_SKILLS` labels), socials/YouTube links, `effectiveScore`, verified/pendiente badge. Never imports or reads the private subdoc. Unknown id → "Perfil no disponible". (Linked from `find-coach` later; listing/search is out of scope.)

## 6. Edge cases / errors

- No coach doc yet → editor renders empty form; athlete view shows "Perfil no disponible".
- Upload failure → inline error on that card, form state preserved, no partial write.
- `skills` containing a dimension not in current `COACH_SKILLS` (schema shrank) → ignored on render; missing dimensions simply unselected.
- `autoScore` always clamped `0..100`; `effectiveScore` falls back to `autoScore` when no override.
- Non-coach reaching the editor → handled by existing `RoleGuard` (redirect to `/athlete/home`).

## 7. Security assumption (out-of-repo prerequisite)

Real admin-only enforcement requires **Firestore security rules** (restrict `coaches/{uid}/private/**` to the owner/admin) and **Storage rules** (restrict `coach-private/**`). These are configured in the Firebase console, not in this repository. This design's contribution is the **data split** that makes such rules enforceable and guarantees the public doc never contains private fields and the athlete UI never reads the private subdoc. The spec explicitly records that authoring those rules is a separate, out-of-repo prerequisite for production privacy.

## 8. Testing

The only test mechanism is Playwright e2e (`yarn test:e2e`); auth is Google popup and not automatable, so e2e covers only unauthenticated-observable behavior:
- `/athlete/coach/<unknown-id>` resolves and shows "Perfil no disponible".

`lib/coach-score.ts` is pure and verified by `yarn typecheck` + manual reasoning (no unit runner in repo — do not add one).

Gates (must pass before done): `yarn typecheck`, `yarn build`, `yarn test:e2e`. `yarn lint` is broken project-wide (ESLint 10, no config — pre-existing, out of scope) and is intentionally skipped.

## 9. Out of scope / deferred (YAGNI)

Video-presentación UI (upload-vs-link undecided — only a reserved placeholder field), admin verification/override UI, `find-coach` search/listing wiring, reviews/ratings, authoring the Firestore/Storage security rules.

## Affected files (indicative)

- New: `firebase/coaches/main.ts`, `firebase/coaches/coach.model.ts`, `firebase/coaches/coach.dtos.ts`, `lib/coach-score.ts`, `CONSTANTS/COACH_SKILLS.js`, `CONSTANTS/COACH_SCORE.js`, `components/coach/{SkillsCard,MediaCard,LinksCard,PrivateCard,ScoreCard}.tsx`, `app/(app)/athlete/coach/[id]/page.tsx`, `e2e/coach-profile.spec.ts`.
- Modified: `app/(app)/coach/coach-profile/page.tsx` (stub → editor), `CLAUDE.md` (coaches collection + manual admin score/status note).
