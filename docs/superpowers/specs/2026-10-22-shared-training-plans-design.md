# Shared training plans (entrenos públicos, privados y suscripciones)

Date: 2026-10-22
Status: draft — pending user approval (builder check done)

## Intent / why

Today only coaches can plan training (`/coach/training`, `components/coach/TrainingPlanner.tsx`). Athletes who train on their own (or follow someone else's program) have no place to plan or follow workouts in nadamas.

The user wants:

1. Athletes can create their own training plans (same macro → meso → micro planner coaches use).
2. Each plan (macrocycle) can be **public** or **private**.
3. Other athletes can find public plans and **subscribe**. Private plans need an **invitation**.
4. A **Compartir** button generates an invitation/share link.
5. A subscribed plan shows up as a tab/chip next to the athlete's own plans; selecting it shows the existing "Entreno de hoy" interface (today's workout, Último / Siguiente navigation).

Unit of sharing = **one macrocycle** (one `trainingPlans` doc, which holds the macro plus its mesos/micros/workouts).

## Goals

- Athlete nav gets a new tab **Entrenos** → `/athlete/training`.
- In `/athlete/training`: chips for (a) my own macros, (b) macros I'm subscribed to, plus "+ MACRO-ciclo". Own macros: full planner, editable. Subscribed macros: read-only "Entreno de hoy" + read-only planning view.
- Per-macro visibility switch: Privado (default) / Público.
- Athlete search (`/athlete/search`, `components/athlete/AthleteSearch.tsx`, today filters Escuelas / Profes) gets a third filter for public plans.
- Plan preview page with Suscribirme / Compartir.
- Share link: for public plans it opens the preview; for private plans it is the invitation — a logged-in user who opens it can subscribe.
- Author can see subscriber count, remove subscribers, and revoke/regenerate the invite link.
- Coaches get the same visibility + share mechanism on their own plans in `/coach/training` (same component).

## Non-goals (for now)

- Copying/forking a plan into an editable personal copy.
- Per-subscriber progress tracking, marking workouts done, comments, ratings.
- Computed total volume (km) on cards.
- Notifications to subscribers when the author edits.
- Paid plans.

## Anti-goals (would make this a failure even if it "works")

- Exposing any existing plan publicly without the author choosing it. All existing plans stay private.
- A private plan becoming readable by anyone who isn't the author or an accepted subscriber (e.g. guessing an id, or listing the collection).
- Subscribers being able to edit someone else's plan.
- Raw technical errors in UI or client logs (project rule — use `lib/user-facing-error.ts`).

## Behavior decisions

### Subscription semantics (Claude's call, confirmed in conversation playback, not objected to)

- Subscriber sees the author's plan **live and read-only**. Author edits are visible immediately. Not a copy.
- Dates are the author's dates. No shifting to the subscription date.
- Unsubscribe from the subscribed chip (menu / button in the read-only view).
- If the author deletes the plan or removes the subscriber, the chip disappears for the subscriber (quiet "Este entreno ya no está disponible").
- Claude's call: switching public → private does **not** kick existing subscribers, whether they came via search or invite. They keep access; author can remove them individually. Rationale: silent loss of a plan someone is following mid-cycle is worse. So read access = owner OR public OR `subscribers/{uid}` exists — no `via` check needed.

### Search card (compact) — Claude's proposal, user said "arranca"

- Macro title
- Author: photo + name (+ "Coach verificado" badge when the author's coach profile is verified — reuse existing badge logic)
- Dates: "6 ene – 30 mar · 12 semanas"
- Goal (`goal`), clamped to 2 lines
- Sessions per week from `sessionWeekdays` ("L · Mi · V")
- Subscriber count
- Status: "En curso" / "Empieza en N días" / "Terminado"

Ordering: in progress and upcoming first, finished last (still visible). Text search matches title, goal, and author name.

### Preview page

- Everything on the card + full description (`content`)
- List of mesocycles: title, dates, goal
- Sample of one workout (today's if any, else the first scheduled), rendered with the existing read-only workout rendering used by `TodayTrainingSummary`
- Buttons: **Suscribirme** (or **Suscrito ✓ / Dejar de seguir**), **Compartir**
- If the viewer is the author: show visibility switch, subscriber list, link controls instead of Suscribirme.

### Labels

- Nav tab: **Entrenos** (label and mobileLabel).
- Search filter: **Entrenos** — not "Planes", because "Planes" is already the mobile label of *Pagos y planes*. (User said "planes"; Claude flagged the clash and proposed "Entrenos"; user didn't object.)

### User decisions (after builder check)

- **Public = fully open.** A public plan's full content (all cycles and workouts) is readable by any signed-in user, subscribed or not. Subscribing only adds the chip / follow. So `summary` can live on the plan doc and search can query `trainingPlans` directly. The "sample workout" in the preview is a UX choice, not access control.
- **Coach and athlete plans are mixed.** One pool per `userId`: the same plans appear in `/coach/training` and `/athlete/training`. No `context` field. `summary.authorRole` = `'coach'` if the author has the coach role, else `'athlete'` (used only for the badge).

## Data model (proposal — builder may adjust names)

`trainingPlans/{planId}` (existing) — add:

- `visibility: 'private' | 'public'` (missing = private)
- `summary` — denormalized, small, safe-to-share fields for search cards: `{ title, goal, startDate, endDate, sessionWeekdays, authorName, authorPhoto, authorRole }`. Kept in sync on every save by the client-side CRUD (same way `autoScore` is recomputed client-side for coaches).
- `subscriberCount: number` (maintained server-side)

Subscriptions: `trainingPlans/{planId}/subscribers/{uid}` → `{ uid, name, photo, createdAt, via: 'public' | 'invite' }`. Plus a per-user index so the athlete can list their subscriptions cheaply: `users/{uid}/trainingSubscriptions/{planId}` → `{ planId, createdAt }` (or a collection-group query on `subscribers` where `uid == me` — builder's choice; collection-group needs an index in `firestore.indexes.json`).

Invite link: a random token, stored only as a hash (same pattern as `lib/server/athlete-profile-invitations.ts`): e.g. `trainingPlans/{planId}/private/invite` → `{ tokenHash, createdAt }`. Link format: `/athlete/training/plans/{planId}?invite={token}`. Regenerating replaces the hash (old links stop working).

Public link for public plans: `/athlete/training/plans/{planId}` (no token).

## Access control

Firestore rules live in the repo (`firestore.rules`, `match /trainingPlans/{id}` at ~line 178). Current rules: owner-only read/write, `create` restricted to keys `userId, createdAt, cycles`; `update` restricted to `cycles, updatedAt`. These must be extended:

- Read plan: owner, OR `visibility == 'public'`, OR a `subscribers/{request.auth.uid}` doc exists.
- Create/update: owner only; allow the new keys (`visibility`, `summary`), with validation on types/sizes. `subscriberCount` not client-writable.
- Search: query `where('visibility','==','public')` — rule must allow list for that constraint only.
- `subscribers/{uid}`: author can read/delete all; a user can read/delete their own. **Create goes through a server route** (admin SDK) so the invite token can be verified server-side and `subscriberCount` updated in a transaction. For public plans the same route is used (no token needed) for consistency.
- `private/invite`: no client access; server only.

Server routes (pattern: `app/api/...` + `lib/server/*` with `adminDb`, authed via `lib/client/authed-api.ts`):

- `POST /api/training-plans/{id}/subscribe` body `{ invite? }` → verifies public or token, writes subscriber + index, increments count.
- `DELETE /api/training-plans/{id}/subscribe` → self-unsubscribe (or rules-based client delete + server count fix; builder's call).
- `GET /api/training-plans/{id}/preview?invite=` → Claude's call: invite link opens the same preview page first (not auto-subscribe). For a private plan the non-subscriber can't read the doc, so this route verifies the token and returns summary + mesocycle list + sample workout.
- `POST /api/training-plans/{id}/invite` (author only) → returns new token link.
- `DELETE /api/training-plans/{id}/subscribers/{uid}` (author only) → remove subscriber.

## UI pieces

- `components/app-chrome/nav-config.ts`: add `{ href: '/athlete/training', label: 'Entrenos', mobileLabel: 'Entrenos', icon: 'training' }` to athlete primary nav.
- `app/(app)/athlete/training/page.tsx`: renders the planner in athlete mode.
- `TrainingPlanner` (867 lines, currently in `components/coach/`): reuse for athletes. It only depends on `useUser` + `TrainingPlanCRUD`, nothing coach-specific found. Builder decides whether to move it to a shared folder; must add: subscribed-plan chips, read-only mode for non-owned plans, visibility switch, share button. Keep coach behavior unchanged apart from the new switch/share.
- `TodayTrainingSummary` already takes `plans: TrainingPlan[]` — feed it the selected plan (own or subscribed).
- `AthleteSearch`: add `'plans'` kind with label "Entrenos"; result rows link to preview.
- Preview page: `app/(app)/athlete/training/plans/[id]/page.tsx`.
- Share: reuse `copyTextToClipboard` / `CopyLinkButton` pattern; use Web Share API when available (mobile PWA) with clipboard fallback.

Opening an invite link while logged out → login → redirect back via existing `?redirectTo=`.

## Constraints

- Follow the `firebase/<domain>/main.ts` + `FirebaseCRUD` pattern; no Firestore calls from components.
- Spanish UI copy, English code/routes.
- Biome, `pnpm typecheck`, Playwright e2e (`e2e/*.spec.ts`) for the main flows: athlete creates plan → makes public → second athlete finds it in search → subscribes → sees "Entreno de hoy"; private plan via invite link; non-invited user denied.
- Emulator-based testing for authed flows (see existing memory/notes).
- Error standard: `GENERIC_USER_ERROR` + `reportInternalError`.

## Left to the builder

- Exact component split and folder move of `TrainingPlanner`.
- Subscription index approach (per-user subcollection vs collection-group).
- Firestore index definitions.
- Empty states and copy details beyond what's listed.
- How subscribed chips are visually distinguished from own chips (e.g. author avatar or outline style).
