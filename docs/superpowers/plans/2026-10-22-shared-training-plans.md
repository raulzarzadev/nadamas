# Shared Training Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Athletes plan their own macrocycles, mark them public/private, find and subscribe to other people's plans, and share invite links for private ones.

**Architecture:** Reuse `TrainingPlanner` for athletes under a new `/athlete/training` tab. `trainingPlans` docs gain `visibility` + denormalized `summary`. Subscriptions live in a top-level `trainingPlanSubscriptions/{planId}_{uid}` collection (same id pattern as `schoolMemberships`) and invite token hashes in `trainingPlanInvites/{planId}`; both are written only by server routes (admin SDK), which also maintain `subscriberCount`.

**Tech Stack:** Next.js 16 App Router, React 19, Firebase 12 client + firebase-admin 13, Firestore rules in `firestore.rules`, Tailwind v4, Playwright e2e against the Firebase emulator.

**Spec:** `docs/superpowers/specs/2026-10-22-shared-training-plans-design.md`

## Global Constraints

- UI copy Spanish; code, route paths and identifiers English.
- Firestore access from client only via `firebase/<domain>/main.ts` classes wrapping `FirebaseCRUD`; never from components.
- Errors: show `GENERIC_USER_ERROR` / calm Spanish text; call `reportInternalError(CODE, cause)`; never render `error.message`. Server routes `console.error('[CODE]', error)` and return a Spanish `{ error }`.
- Biome only (`pnpm check`), `pnpm typecheck` must pass.
- Tailwind CSS vars as `text-(--c-x)`, not `text-[var(--c-x)]`.
- Existing plans have no `visibility` → treated as `'private'`. Never write `visibility: 'public'` without an explicit user toggle.
- Public plan = full content readable by any signed-in user (user decision).
- Coach and athlete plans are one pool per `userId` (user decision): same chips in `/coach/training` and `/athlete/training`.
- Public → private keeps existing subscribers.
- Labels: nav tab `Entrenos` (label + mobileLabel); search filter `Entrenos`.
- No unit test runner: tests are Playwright e2e in `e2e/`, run with emulator (`pnpm dev:emu` running, then `pnpm test:e2e e2e/<file>`). Log in in e2e with the OTP dev link pattern from `e2e/payments.spec.ts:510-523`.

## Review Focus

1. Opening an invite/preview link while logged out → login → lands back on the same link (with `invite` param) and can subscribe. Test added in Task 6.
2. Subscribing twice (double tap, or reopening link) → one subscription, `subscriberCount` incremented once. Test in Task 5 (click Suscribirme, reload, count shows 1).
3. Plan deleted by author while subscription doc remains → subscriber's `/athlete/training` loads without error and shows no chip for it. Test in Task 6.
4. Old invite link after "Generar nuevo enlace" → calm Spanish message, no subscribe button, no plan content. Test in Task 6.
5. Author opens own plan preview → sees owner controls, never "Suscribirme"; server rejects self-subscribe (`SELF_SUBSCRIBE` → 400). UI assertion in Task 5; server guard in Task 4.
6. Plan with no workout today / not started yet → preview sample falls back to first scheduled session; "Entreno de hoy" shows existing empty state. Covered by Task 5 sample-workout rule.

---

### Task 1: Data model, summary helpers, CRUD and owner-field rules

**Files:**
- Modify: `firebase/training-plans/training-plan.model.ts`
- Create: `lib/training-plan-summary.ts`
- Modify: `firebase/training-plans/main.ts`
- Modify: `firestore.rules:178-190` (trainingPlans block) and `firestore.rules:71-90` (`isLegacyCollection` exclusion list)
- Modify: `components/coach/TrainingPlanner.tsx` (pass author to create/update)
- Test: `e2e/training-planner.spec.ts` (existing, regression)

**Interfaces:**
- Produces (model):
  ```ts
  export type TrainingPlanVisibility = 'private' | 'public'
  export interface TrainingPlanAuthor { name: string; photo: string; role: 'coach' | 'athlete' }
  export interface TrainingPlanSummary {
    title: string; goal: string; content: string
    startDate: string; endDate: string; sessionWeekdays: number[]
    authorName: string; authorPhoto: string; authorRole: 'coach' | 'athlete'
  }
  export interface TrainingPlan {
    id: string; userId: string; createdAt: number; cycles: TrainingCycle[]
    visibility?: TrainingPlanVisibility; summary?: TrainingPlanSummary; subscriberCount?: number
  }
  ```
- Produces (`lib/training-plan-summary.ts`):
  - `buildTrainingPlanSummary(cycles: TrainingCycle[], author: TrainingPlanAuthor): TrainingPlanSummary` — values from the `type === 'macro'` cycle; strings default `''`, `sessionWeekdays` default `[]`; `content` truncated to 2000 chars, `goal`/`title` to 300.
  - `trainingPlanStatus(startDate: string, endDate: string, today: string): { kind: 'upcoming'; days: number } | { kind: 'active' } | { kind: 'finished' }` — dates are `YYYY-MM-DD`, compare as calendar days.
  - `trainingPlanStatusLabel(status): string` → `'Empieza mañana'` (days 1), `'Empieza en N días'`, `'En curso'`, `'Terminado'`.
  - `weekdayLabels(days: number[]): string` — 0=Sunday (matches `getUTCDay` in `lib/training-session-builder.ts:58`); order Monday-first; labels `L, Ma, Mi, J, V, S, D`; joined with `' · '`.
  - `planWeeks(startDate, endDate): number` — `Math.ceil(days/7)`, min 1.
- Produces (`TrainingPlanCRUD`):
  - `list(userId)` (unchanged signature)
  - `get(id: string): Promise<TrainingPlan | null>` — decoded cycles; resolves `null` on not-found **or** permission-denied.
  - `create(cycles: TrainingCycle[], author: TrainingPlanAuthor)` — writes `cycles`, `visibility: 'private'`, `summary`.
  - `update(id: string, cycles: TrainingCycle[], author: TrainingPlanAuthor)` — writes `cycles`, `summary`.
  - `setVisibility(id: string, visibility: TrainingPlanVisibility)`
  - `listPublic(): Promise<TrainingPlan[]>` — `where('visibility','==','public')`.
  - `listSubscribed(uid: string): Promise<TrainingPlan[]>` — reads `trainingPlanSubscriptions` where `uid == uid`, then `get` each `planId`, drops `null`s. Uses a second private `FirebaseCRUD('trainingPlanSubscriptions')`.
- Produces (`TrainingPlanner` helper): `useTrainingPlanAuthor(): TrainingPlanAuthor` hook in `components/coach/use-training-plan-author.ts` — name via `publicNameFromUser(user)`, photo via `user.photoURL || user.photoUrl || ''`, role `'coach'` when `useRole().roles.coach` else `'athlete'`.

- [ ] **Step 1: Run the existing planner e2e to get a green baseline**

Run: `pnpm test:e2e e2e/training-planner.spec.ts e2e/training-macro-create.spec.ts`
Expected: PASS (if it fails before any change, stop and report).

- [ ] **Step 2: Add the model types and `lib/training-plan-summary.ts`** with the signatures above.

- [ ] **Step 3: Update `TrainingPlanCRUD`** per Interfaces. `create` must not include `subscriberCount`.

- [ ] **Step 4: Update rules** for `match /trainingPlans/{id}`:
  - `allow read: if isOwner(resource) || (signedIn() && resource.data.get('visibility', 'private') == 'public') || (signedIn() && exists(/databases/$(database)/documents/trainingPlanSubscriptions/$(id + '_' + request.auth.uid)));`
  - `allow delete: if isOwner(resource);`
  - create: keys `hasOnly(['userId','createdAt','cycles','visibility','summary'])`, `visibility in ['private','public']` when present, `summary is map` when present; existing cycles checks kept.
  - update: `affectedKeys().hasOnly(['cycles','updatedAt','visibility','summary'])`, same validation; `subscriberCount` therefore not client-writable.
  - Add `match /trainingPlanSubscriptions/{subId} { allow read: if signedIn() && (resource.data.uid == request.auth.uid || resource.data.ownerId == request.auth.uid); allow write: if false; }`
  - Add `match /trainingPlanInvites/{planId} { allow read, write: if false; }`
  - Add `'trainingPlanSubscriptions'` and `'trainingPlanInvites'` to the `isLegacyCollection` exclusion list.

- [ ] **Step 5: Wire `useTrainingPlanAuthor()` into `TrainingPlanner`** and pass it to every `TrainingPlanCRUD.create/update` call (`TrainingPlanner.tsx:143, 227, 229, 280, 301`).

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm check && pnpm test:e2e e2e/training-planner.spec.ts e2e/training-macro-create.spec.ts`
Expected: all PASS (restart emulator so new rules load).

- [ ] **Step 7: Commit** — `feat(training): add plan visibility, summary and sharing rules`

---

### Task 2: Athlete "Entrenos" tab with own and subscribed plans

**Files:**
- Modify: `components/app-chrome/nav-config.ts` (athlete primary nav)
- Create: `app/(app)/athlete/training/page.tsx`
- Modify: `components/coach/TrainingPlanner.tsx` (load subscribed plans, chips, read-only mode)
- Test: `e2e/shared-training-plans.spec.ts` (new)

**Interfaces:**
- Consumes: `TrainingPlanCRUD.list`, `TrainingPlanCRUD.listSubscribed` (Task 1).
- Produces: in `TrainingPlanner`, `const owned = plan?.userId === uid`. Subscribed plans render as chips after own ones with author name (`summary.authorName`) as a second line and `aria-label="Suscrito: {title}"`. When `!owned`: show "Entreno de hoy" + `TodayTrainingSummary plans={[plan]}`, `TrainingPlanOverview readOnly`, no edit/delete/bars controls, plus an `Dejar de seguir` button (wired in Task 5; render hidden until then is fine — or add in Task 5).
- Note: `TodayTrainingSummary` currently receives all `plans`; pass only own plans when an own plan is selected (current behavior) and `[plan]` when a subscribed plan is selected.

- [ ] **Step 1: Write failing e2e** `test('entrenos: atleta crea su macrociclo desde la pestaña Entrenos')` in `e2e/shared-training-plans.spec.ts`: log in as new athlete (OTP dev link helper copied into the spec as `loginAs(page, request, email)`), click `getByRole('link', { name: 'Entrenos', exact: true })`, expect URL `/athlete/training`, create a macro (reuse the create flow from `e2e/training-macro-create.spec.ts`), reload, expect chip with that title visible.

- [ ] **Step 2: Run** `pnpm test:e2e e2e/shared-training-plans.spec.ts` — Expected: FAIL (no Entrenos link).

- [ ] **Step 3: Add nav entry** `{ href: '/athlete/training', label: 'Entrenos', mobileLabel: 'Entrenos', icon: 'training' }` after Horarios; add the page rendering `<TrainingPlanner />`.

- [ ] **Step 4: Load subscribed plans in the planner effect** (`TrainingPlanner.tsx:82-106`) with `Promise.all([list(uid), listSubscribed(uid)])`; keep own sorted by `createdAt` desc, subscribed after. Implement read-only branch per Interfaces.

- [ ] **Step 5: Run** the new spec + `e2e/training-planner.spec.ts` — Expected: PASS.

- [ ] **Step 6: Commit** — `feat(training): add athlete Entrenos tab`

---

### Task 3: Visibility switch and Compartir on own plans

**Files:**
- Create: `components/training/PlanSharingControls.tsx`
- Create: `lib/client/share-link.ts`
- Modify: `components/coach/TrainingPlanner.tsx` (render controls under the plan heading when `owned`)
- Test: `e2e/shared-training-plans.spec.ts`

**Interfaces:**
- Consumes: `TrainingPlanCRUD.setVisibility`.
- Produces:
  - `shareLink(url: string, title: string): Promise<'shared' | 'copied'>` — `navigator.share` when available (ignore `AbortError` → treat as shared), else `copyTextToClipboard` from `lib/client/copy-to-clipboard`.
  - `trainingPlanUrl(planId: string, invite?: string): string` → `${location.origin}/athlete/training/plans/${planId}` + `?invite=${invite}` when given. Put in `lib/client/share-link.ts`.
  - `<PlanSharingControls plan={TrainingPlan} onChange={(plan: TrainingPlan) => void} />` — a switch `role="switch"` labeled `Público`, helper text `Cualquiera puede encontrarlo y seguirlo.` / `Solo tú y las personas que invites.`; button `Compartir`; subscriber count `N suscriptores` (`1 suscriptor`). In this task Compartir on a private plan shares the plain URL; Task 6 swaps in the invite link.

- [ ] **Step 1: Failing e2e** `test('entrenos: hacer público un macrociclo se conserva al recargar')`: create macro, switch `Público` on, reload, expect switch `aria-checked="true"`; click `Compartir`, expect status text `Enlace copiado` (Desktop Chrome in Playwright has no `navigator.share`; grant `clipboard-read`/`clipboard-write` permissions on the context).

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement** helpers and component; optimistic toggle, revert + `GENERIC_USER_ERROR` on failed `CRUDResponse`.

- [ ] **Step 4: Run** — Expected: PASS. Also `pnpm typecheck && pnpm check`.

- [ ] **Step 5: Commit** — `feat(training): add plan visibility switch and share button`

---

### Task 4: Server sharing service and API routes

**Files:**
- Create: `lib/server/training-plan-sharing.ts`
- Create: `app/api/training-plans/[id]/subscription/route.ts` (POST, DELETE)
- Create: `app/api/training-plans/[id]/preview/route.ts` (GET)
- Create: `app/api/training-plans/[id]/invite/route.ts` (POST)
- Create: `app/api/training-plans/[id]/subscribers/route.ts` (GET — author list)
- Create: `app/api/training-plans/[id]/subscribers/[uid]/route.ts` (DELETE)
- Create: `firebase/training-plans/sharing.ts` (client wrappers)
- Test: covered by e2e in Tasks 5–6; this task verifies with `pnpm typecheck && pnpm check` plus one e2e (Step 1).

**Interfaces:**
- Server (`lib/server/training-plan-sharing.ts`, `import 'server-only'`, uses `adminDb` from `./firebase-admin`, token hashing exactly like `lib/server/athlete-profile-invitations.ts:9` with `randomBytes(32).toString('base64url')`):
  - `subscriptionId(planId: string, uid: string): string` → `${planId}_${uid}`
  - `type PlanPreview = { id: string; summary: TrainingPlanSummary; subscriberCount: number; visibility: TrainingPlanVisibility; cycles: TrainingCycle[]; isOwner: boolean; isSubscribed: boolean }` — `cycles` decoded; for a private plan accessed by token only, include cycles too (same as public, per "abierto").
  - `getPlanPreview(planId, uid, invite?: string): Promise<PlanPreview | null>` — null when plan missing, or private and caller is not owner/subscriber and token hash mismatches.
  - `subscribe(planId, uid, subscriber: { name: string; photo: string }, invite?: string): Promise<void>` — transaction: read plan, reject owner (`throw new Error('SELF_SUBSCRIBE')`), require public or valid token or existing subscription (`'FORBIDDEN'`); if subscription doc exists → no-op; else set `{ planId, uid, ownerId, name, photo, via: invite ? 'invite' : 'public', createdAt: Date.now() }` and `FieldValue.increment(1)` on `subscriberCount`.
  - `unsubscribe(planId, uid)` / `removeSubscriber(planId, ownerUid, subscriberUid)` — transaction delete + `increment(-1)` only if the doc existed; `removeSubscriber` checks `plan.userId === ownerUid`.
  - `createInvite(planId, ownerUid): Promise<string>` — owner check, set `trainingPlanInvites/{planId}` `{ tokenHash, ownerId, createdAt }` (overwrites → old links die), returns token.
  - `listSubscribers(planId, ownerUid): Promise<{ uid: string; name: string; photo: string; createdAt: number }[]>`
- Routes: auth via `getSchoolCaller(request)` from `lib/server/school-access` (returns `DecodedIdToken | null`); 401 `{ error: 'Inicia sesión para continuar.' }`. `subscriber.name/photo` come from the caller's `users/{uid}` doc via `publicNameFromUser` + `photoURL`, not from the request body. Map `SELF_SUBSCRIBE`/`FORBIDDEN` → 400/403 `{ error: 'No pudimos suscribirte a este entreno.' }`; preview null → 404 `{ error: 'Este entreno no está disponible o el enlace ya no es válido.' }`. `Cache-Control: private, no-store` on GETs. `export const runtime = 'nodejs'`.
  - `POST /subscription` body `{ invite?: string }`; `DELETE /subscription`; `GET /preview?invite=`; `POST /invite` → `{ token }`; `GET /subscribers`; `DELETE /subscribers/[uid]`.
- Client (`firebase/training-plans/sharing.ts`, using `getAuthed/postAuthed/deleteAuthed` from `lib/client/authed-api`): `TrainingPlanSharing = { preview(id, invite?), subscribe(id, invite?), unsubscribe(id), createInvite(id): Promise<string>, subscribers(id), removeSubscriber(id, uid) }`.

- [ ] **Step 1: Implement** service, routes, client wrappers. (Behavior is exercised end-to-end in Tasks 5–6; self-subscribe rejection is asserted there through the preview page.)

- [ ] **Step 2: Verify** `pnpm typecheck && pnpm check` — Expected: PASS.

- [ ] **Step 3: Commit** — `feat(training): add plan subscription and invite API`

---

### Task 5: Search filter, preview page, subscribe/unsubscribe

**Files:**
- Modify: `components/athlete/AthleteSearch.tsx` (third kind)
- Create: `components/training/TrainingPlanCard.tsx`
- Create: `components/training/TrainingPlanPreview.tsx`
- Create: `app/(app)/athlete/training/plans/[id]/page.tsx`
- Modify: `components/coach/TrainingPlanner.tsx` (`Dejar de seguir` on subscribed plans)
- Test: `e2e/shared-training-plans.spec.ts`

**Interfaces:**
- Consumes: `TrainingPlanCRUD.listPublic`, `TrainingPlanSharing.*`, summary helpers, `CoachCRUD.getPublic(uid)` (verified badge when `verification?.status === 'verified'`, label `Coach verificado`).
- `AthleteSearch`: `type Kind = 'coaches' | 'schools' | 'plans'`; `KIND_LABEL.plans = 'Entrenos'`; `initialTab` may be `'plans'` (only that kind on). `listPublic()` once on mount; filter by query over `summary.title`, `summary.goal`, `summary.authorName` (case/accent-insensitive — reuse whatever normalizer AthleteSearch already uses for schools); exclude own plans; order active, upcoming (soonest first), finished last.
- `<TrainingPlanCard plan={TrainingPlan} today={string} verified={boolean} />` — link to `/athlete/training/plans/{id}`; shows title, author photo+name, `6 ene – 30 mar · 12 semanas` (`es-MX`, `day: 'numeric', month: 'short'`), goal `line-clamp-2`, `weekdayLabels`, `N suscriptores`, status label.
- `<TrainingPlanPreview planId={string} invite?: string />` — loads via `TrainingPlanSharing.preview`; renders card data + full `content`, mesocycle list (title, dates, goal), one sample workout: today's session for that plan via `getTrainingSessionsForDate([plan], today)` else first date from `getTrainingDateNeighbors`, rendered the same way `TodayTrainingSummary` renders a session. Buttons: not owner & not subscribed → `Suscribirme`; subscribed → `Suscrito` + `Dejar de seguir` + `Ver entreno de hoy` (link `/athlete/training?plan={id}`); owner → `PlanSharingControls`. Always `Compartir`.
- `TrainingPlanner` reads `?plan=` search param to preselect a plan chip.

- [ ] **Step 1: Failing e2e** `test('entrenos: otro atleta encuentra un entreno público, se suscribe y ve el entreno de hoy')` using two browser contexts: A creates macro titled `Base aeróbica ${id}` whose dates include today with a workout on today's weekday (reuse helpers), sets Público. B logs in, `/athlete/search`, checks only `Entrenos`, types the title, clicks the card, clicks `Suscribirme`, reloads, expects `Suscrito` and `1 suscriptor`, clicks `Ver entreno de hoy`, expects chip `Suscrito: Base aeróbica…` pressed and heading `Entreno de hoy`, and no `Editar` buttons. A opens the same preview URL → expects no `Suscribirme` button and the `Público` switch visible. Then B clicks `Dejar de seguir` → chip gone.

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement** components, page, search kind, unsubscribe button.

- [ ] **Step 4: Run** new spec + `e2e/role-shell.spec.ts` (search page regression) — Expected: PASS. `pnpm typecheck && pnpm check`.

- [ ] **Step 5: Commit** — `feat(training): add public plan search, preview and subscriptions`

---

### Task 6: Private invite links and subscriber management

**Files:**
- Modify: `components/training/PlanSharingControls.tsx`
- Create: `components/training/PlanSubscribersSheet.tsx`
- Modify: `components/training/TrainingPlanPreview.tsx` (invite param + error state)
- Test: `e2e/shared-training-plans.spec.ts`

**Interfaces:**
- Consumes: `TrainingPlanSharing.createInvite/subscribers/removeSubscriber`, `trainingPlanUrl`.
- `PlanSharingControls`: when private, `Compartir` calls `createInvite` only if no token cached in component state, then `shareLink(trainingPlanUrl(id, token))`. Secondary button `Generar nuevo enlace` (confirm text `Los enlaces anteriores dejarán de funcionar.`). Subscriber count opens `PlanSubscribersSheet` (uses `components/ui/sheet`): rows with photo, name, `Quitar` button.
- Preview 404 → text `Este entreno no está disponible o el enlace ya no es válido.` and no plan content.
- Logged-out visit: `/athlete/...` is behind `AuthGate`; confirm login returns to the full URL including `?invite=` via `redirectTo`; fix `redirectTo` construction if it drops the query string.

- [ ] **Step 1: Failing e2e** (each its own `test`):
  - `entrenos: invitación privada` — A creates private plan, clicks `Compartir`, reads clipboard URL. C (new athlete) opens URL without the `invite` param → not-available text; opens full URL → `Suscribirme` → `Suscrito`.
  - `entrenos: enlace regenerado deja de funcionar` — A `Generar nuevo enlace`; D opens the old URL → not-available text.
  - `entrenos: quitar suscriptor` — A opens subscribers, `Quitar` C; C reloads `/athlete/training` → no chip for that plan, no error alert.
  - `entrenos: entreno borrado no rompe la pestaña` — B subscribed to a public plan; A deletes it; B loads `/athlete/training` → page loads, no chip, no `role="alert"`.
  - `entrenos: abrir invitación sin sesión` — fresh context opens invite URL → login → after login URL contains `invite=` and `Suscribirme` visible.

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run** full `pnpm test:e2e e2e/shared-training-plans.spec.ts e2e/training-planner.spec.ts e2e/training-macro-create.spec.ts e2e/role-shell.spec.ts` + `pnpm typecheck && pnpm check` — Expected: PASS.

- [ ] **Step 5: Commit** — `feat(training): add private invite links and subscriber management`
