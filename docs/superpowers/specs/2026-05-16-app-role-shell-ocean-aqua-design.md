# Design — App role-shell + ocean/aqua restyle

Date: 2026-05-16
Status: Approved (brainstorming)
Scope: **Visual + role shell** only. No booking, payments, reviews, real search, availability calendar, or verification workflow — those screens are stubs.

## Goal

Bring the product app (`app/(app)/`) in line with the landing's promises and visual system:

1. Multi-role per user (athlete / coach / admin), Airbnb-style active-role switcher.
2. Adopt the landing's ocean/aqua design system; drop dark mode.
3. Restyle existing screens and slot them under the right role.

## Decisions (locked during brainstorming)

- **Scope**: visual + role shell. No real booking/payments/reviews/search/calendar/verification. Those are stub screens.
- **Roles**: one user can hold all three. `roles: { athlete: true (always), coach: boolean (self-enable, instant, no verification yet), admin: boolean (manual via Firestore) }`. Airbnb-style switcher between athlete/coach. Admin = separate button, visible only if `roles.admin`.
- **Theme**: adopt landing ocean/aqua tokens, **light only**. Remove dark-mode toggle + `ThemeContext`. Shared tokens between marketing and app. daisyUI primitives kept but restyled to brand.
- **Existing screens**: keep working, restyle to ocean/aqua, slot by role — events ⇒ Athlete › progress; teams ⇒ Coach › students; profile shared.
- **Routing**: Approach A — explicit per-role segments, persisted `activeRole`, per-segment guard, shared profile, redirects from old `/dashboard/*`.

## 1. Route structure (Approach A)

```
app/(app)/
  layout.tsx         Providers: UserProvider + RoleProvider  (ThemeProvider removed)
  auth-gate.tsx      unchanged behavior
  login/             restyled
  logout/
  profile/           SHARED, restyled (moved from dashboard/profile)
  athlete/
    layout.tsx       AppChrome(athlete) — no guard (athlete always on)
    home/            stub: cards → find-coach, progress, bookings
    find-coach/      stub (search placeholder)
    progress/        = existing events CRUD, restyled (list, new, [id], [id]/edit)
    bookings/        stub
  coach/
    layout.tsx       RoleGuard(coach) + AppChrome(coach)
    home/            stub: agenda, students, coach-profile, earnings
    agenda/          stub
    students/        = teams, restyled
    coach-profile/   stub
  admin/
    layout.tsx       RoleGuard(admin) + AppChrome(admin)
    home/            stub
    verify-queue/    stub
    users/           stub
```

Redirects in `next.config.mjs`:

- `/dashboard` → `/athlete/home`
- `/dashboard/events` (and `/dashboard/events/:path*`) → `/athlete/progress` (preserve sub-paths)
- `/dashboard/profile` → `/profile`

These keep existing bookmarks/links from 404ing.

## 2. Roles + switcher

### User model

`users` doc gains:

```ts
roles: { athlete: true; coach: boolean; admin: boolean }
```

Back-compat normalization (read path): missing `roles` ⇒ `{ athlete: true, coach: !!isCoach, admin: false }`. `athlete` is always `true`. Legacy `isCoach` is the only source for coach until the user re-saves. `admin` is never derived — only an explicit Firestore value.

### RoleProvider (`context/RoleContext.tsx`)

Client context, mounted in `app/(app)/layout.tsx` after `UserProvider`. Exposes:

- `roles` — normalized from `user`.
- `activeRole` — `'athlete' | 'coach' | 'admin'`. Persisted in `localStorage` (`nadamas.activeRole`). Validated against `roles` on read; if the held role is no longer granted, fall back to `athlete`.
- `setActiveRole(role)` — persists + `router.push('/{role}/home')`.
- `enableCoach()` — Firestore mutation setting `roles.coach = true` (+ `updatedAt`), following the existing `firebase/users` helper / `FirebaseCRUD` pattern. On success the next user snapshot reflects it.
- `isAdmin` — `roles.admin === true`.

### RoleSwitcher (UI in AppChrome)

Airbnb-style dropdown: label `Actuando como: <Rol> ▾`. Options:

- `Atleta` (always).
- `Entrenador` if `roles.coach`; otherwise an action item **"Activar modo entrenador"** → calls `enableCoach()` then switches to coach.
- Admin is NOT in this dropdown. It is a separate **Admin** button/icon in the chrome, rendered only when `isAdmin`, linking to `/admin/home`.

Switching persists `activeRole` and navigates to that role's `/home`.

### Granting admin

`roles.admin = true` is set manually in the Firestore `users` document. No UI grants it. Document this in `CLAUDE.md` and this spec. Seed the owner account (raulzarza.dev@gmail.com) manually for testing.

## 3. Guards

`RoleGuard` component used in `coach/layout.tsx` and `admin/layout.tsx`:

- `user === undefined` → render `<Loading />` (consistent with existing `AuthGate`).
- `user === null` → existing `AuthGate` already handles unauthenticated; `RoleGuard` sits inside the authenticated tree.
- Authenticated but lacks required role:
  - `need="coach"` → redirect to `/athlete/home` + toast "Activa modo entrenador para acceder".
  - `need="admin"` → `notFound()` (404; do not reveal admin exists).
- Athlete segment has no `RoleGuard` (athlete is always granted) but still sits behind `AuthGate`.

## 4. Theme unification

- Extract color / space / radius / shadow / motion CSS custom properties from `components/marketing/marketing-theme.css` into a shared `styles/tokens.css`. Import it from both the marketing CSS entry and the app's `styles/globals.css`. Single source of truth.
- Define a daisyUI custom theme mapped to tokens: `primary` = `--c-ocean-mid`, `accent` = `--c-aqua-strong`, base colors = `--c-bg` / `--c-surface`, content = ocean/text-2. **Light only.**
- Delete `components/Layout/DarkModeToggle.js`, `context/ThemeContext.js`, the `ThemeProvider` from `app/(app)/providers.tsx`, and all `data-theme` dark branches / dark-conditional classes.
- New `components/app-chrome/` (AppChrome + RoleSwitcher + nav) replaces `components/Layout/{index,Navbar,BottomNav}.js` for the `(app)` group. Ocean/aqua styling, reusing marketing button/card class conventions. Includes mobile bottom nav.
- Restyle to tokens: `login`, events (`EventForm`, `EventView`, list), teams screens, `profile`, `Loading`, `Modal`/`ModalDelete`, `Inputs/*`. Keep daisyUI primitives; remove dark-dependent styling.

## 5. Data flow

`UserContext` loads the Firebase user and normalizes `roles` (incl. legacy `isCoach`). `RoleProvider` derives `roles` and resolves `activeRole` (validated vs `roles`, localStorage-backed). `AppChrome` renders nav + switcher per `activeRole`. Per-segment `RoleGuard` gates `coach`/`admin`. Switching role → `setActiveRole` → persist + navigate to `/{role}/home`. "Activar modo entrenador" → `enableCoach()` Firestore write → roles refresh on next snapshot → switch to coach.

## 6. Edge cases

- Stored `activeRole` no longer granted (e.g. admin revoked) → fall back to `athlete`, clear/repair stored value.
- Direct nav to `/coach/*` without `roles.coach` → redirect `/athlete/home` + CTA toast.
- Direct nav to `/admin/*` without `roles.admin` → `notFound()`.
- Legacy users with no `roles` field → treated as athlete (+ coach if legacy `isCoach`). No write needed until they self-enable coach.
- Old `/dashboard/*` URLs → redirects (section 1) so no 404 / broken bookmarks.

## 7. Testing

Playwright e2e (`e2e/*.spec.ts`), following existing patterns:

- Role switcher visible; default label = Atleta.
- Athlete hitting `/coach/home` without coach role → redirected to `/athlete/home`.
- "Activar modo entrenador" reveals Entrenador in switcher and unlocks `/coach/*`.
- Admin button hidden when `roles.admin` is false; `/admin/*` returns 404 for non-admin.
- `/dashboard` redirects to `/athlete/home`; `/dashboard/profile` → `/profile`.

Gates (must pass before done): `yarn typecheck`, `yarn lint`, `yarn build`. (Auth uses Google popup — keep existing e2e auth handling; do not introduce a new auth mechanism.)

## 8. Out of scope (YAGNI)

Booking engine, in-app payments, reviews/ratings, real coach search/filtering, availability calendar, coach verification workflow, dark mode, signup role picker beyond the self-enable coach toggle. The corresponding screens (`find-coach`, `bookings`, `agenda`, `coach-profile`, `verify-queue`, `admin/users`, athlete/coach/admin `home`) are visual stubs only.

## Affected files (indicative)

- New: `context/RoleContext.tsx`, `components/app-chrome/*`, `styles/tokens.css`, `app/(app)/{athlete,coach,admin}/**`, `app/(app)/profile/page.tsx`, new e2e specs.
- Moved/redirected: `app/(app)/dashboard/*` → role segments; `next.config.mjs` redirects.
- Modified: `app/(app)/layout.tsx`, `app/(app)/providers.tsx`, `firebase/users.js` (roles + `enableCoach`), `styles/globals.css`, `app/(marketing)` CSS import, `CLAUDE.md` (roles + admin-granting note).
- Deleted: `components/Layout/DarkModeToggle.js`, `context/ThemeContext.js`, dark branches; `components/Layout/{index,Navbar,BottomNav}.js` superseded by `app-chrome` for `(app)`.
