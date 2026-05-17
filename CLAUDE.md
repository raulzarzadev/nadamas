# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`nadamas` — PWA for swim trainers/coaches tracking athlete performance. Next.js 16 (**App Router**), React 19, Firebase 12 (Firestore + Auth + Storage), TypeScript (`strict: true`, `target: ES2022`), Tailwind v4 + daisyUI v5, PostHog analytics. pnpm.

## Commands

```bash
pnpm dev          # next dev
pnpm build        # next build
pnpm start        # next start (prod, after build)
pnpm lint         # biome lint .
pnpm format       # biome format --write .
pnpm check        # biome check .
pnpm typecheck    # tsc --noEmit
pnpm test:e2e     # playwright test
```

- No unit test runner. Tests are Playwright e2e in `e2e/*.spec.ts` (run via `pnpm test:e2e`).
- Requires env var `NEXT_PUBLIC_FIREBASE_CONFIG` — a JSON string parsed in `firebase/index.js`. App fails at import without it.
- Optional analytics env: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (US cloud default). Empty key = PostHog no-ops, no errors.
- Formatting + linting standard: use **Biome** only. Do not add ESLint or Prettier back unless the user explicitly asks.
- User-facing error standard: never expose raw technical errors, provider messages, stack traces, or `error.message` directly in UI. Show a calm Spanish message such as `Ups, algo salió mal. Inténtalo de nuevo más tarde.` and log the real error internally with a short traceable code (use `lib/user-facing-error.ts` when possible).

## Conventions (from README)

- All route paths and all code in English. UI copy/labels are Spanish (see `CONSTANTS/ROUTES.js` `label` fields). Marketing route slugs are Spanish (`como-verificamos`, `contacto`, `privacidad`, `terminos`).

## Architecture

### App Router structure

- `app/layout.tsx` — root layout: `<html lang="es">` / `<body>`, wraps everything in `PHProvider` (PostHog). Server component.
- Two route groups:
  - `app/(app)/` — the product app (`dashboard`, `login`, `logout`, `auth-gate`). `app/(app)/layout.tsx` wraps children in `Providers`.
  - `app/(marketing)/` — public Spanish-slug pages + landing (`page.tsx`). `app/(marketing)/layout.tsx` renders `SiteNav` / `SiteFooter`, **no `Providers`** (no auth/theme context there).
- `app/providers.tsx` (client) = `Suspense` → `UserProvider` → `ThemeProvider`. Only the `(app)` group mounts it.

### Auth & routing

- `context/UserContext.js` is the auth hub. `authStateChanged` (Google popup auth) drives `user` state: `undefined` = loading, `null` = logged out, object = logged in. Exposes `useUser()` → `{ user, login, logout }`. Post-login redirect via `?redirectTo=` query param, else `/dashboard`.
- `app/(app)/auth-gate.tsx` (`AuthGate`) is the client gate: while `user === undefined` it renders `<Loading />`. Wrap protected sections in it (replaces the old `components/HOC` pattern, which no longer exists).
- Multi-role: `users` doc has `roles: { athlete:true, coach:boolean, admin:boolean }`. `lib/roles.ts` normalizes (legacy `isCoach` ⇒ coach when `roles` absent). `context/RoleContext.tsx` exposes `useRole()` → `{ roles, activeRole, isAdmin, setActiveRole, enableCoach }`; `activeRole` persisted in localStorage. App is split into `app/(app)/{athlete,coach,admin}/` segments behind `AuthGate` + `AppChrome`; `coach`/`admin` add `RoleGuard`. **Admin is granted only by manually setting `roles.admin: true` on the Firestore user doc — there is no UI for it.**

### Analytics (PostHog)

- `instrumentation-client.ts` (root, Next 16 auto-loads) initializes `posthog-js` when `NEXT_PUBLIC_POSTHOG_KEY` is set. Uses `defaults: '2025-05-24'` → automatic SPA pageview + pageleave for App Router; `capture_exceptions: true`.
- `app/posthog-provider.tsx` exports `PHProvider` (client, `PostHogProvider`), mounted in root layout so both `(app)` and `(marketing)` are tracked.
- `context/UserContext.js` calls `posthog.identify(uid, { email, name })` on login and `posthog.reset()` on logout, via `usePostHog()`.

### Firebase data layer — the central pattern

`firebase/FirebaseCRUD.ts` defines a generic `FirebaseCRUD` class instantiated per collection (e.g. `new FirebaseCRUD('teams')`). It is the single source of truth for all Firestore access. Key behaviors:

- `create` auto-injects `createdAt` and `userId` (from `getAuth().currentUser`); `update` auto-injects `updatedAt`.
- All dates are stored/read as numbers via `firebase-dates-util` `Dates.deepFormatObjectDates(obj, 'number')`. Reads go through `FirebaseCRUD.normalizeDoc` which re-applies the same date formatting and merges the doc `id`.
- Realtime is first-class: `listen`, `listenMany(filters, cb)`, `listenUserDocs(cb)` (filters by current user's `uid`), `listenAll`. Filters are raw Firestore `where(...)` clauses passed as an array.
- Mutations return `CRUDResponse`: `{ ok, type, res }` where `type` is like `TEAM_CREATED` / `ERROR_TEAM_DELETED` (derived from collection name minus trailing `s`). Callers branch on `res.type`.
- File uploads: static `FirebaseCRUD.uploadFile({ file, fieldName }, cb)` streams to Storage and reports progress + final `downloadURL` via callback.

Each domain wraps a private `FirebaseCRUD` instance in a thin class exported as a singleton: `firebase/<domain>/main.ts` (e.g. `firebase/teams/main.ts` exports `TeamCRUD`, `firebase/athletes/main.ts` exports `AthleteCRUD`). Models/DTOs live alongside as `*.model.ts` / `*.dto.ts`. **When adding a domain, follow this exact shape** — do not call Firestore directly from components or pages.

Older non-class helpers still exist as loose JS in `firebase/*.js` (`teams.js`, `events.js`, `users.js`, `results.js`, etc.) and `base.crud.ts`/`base.modal.ts` interfaces — these predate the `FirebaseCRUD` class. Prefer the class-based `firebase/<domain>/main.ts` pattern for new work.

Known gotcha: `firebase/athletes/main.ts` instantiates the collection as `'atheltes'` (misspelled). Match existing data before "fixing" it.
- Coach profiles: `coaches/{uid}` (public, athlete-readable) + `coaches/{uid}/private/profile` subdoc (admin/owner only — IDs, certifications, private contacts). `firebase/coaches/main.ts` exports `CoachCRUD` (setDoc-merge by uid, not addDoc). Skills schema = `CONSTANTS/COACH_SKILLS.js`; score weights = `CONSTANTS/COACH_SCORE.js`; `lib/coach-score.ts` computes `autoScore` (recomputed client-side on every save, stored on the public doc). `effectiveScore = verification.adminScoreOverride ?? verification.autoScore`. **`verification.status` and `verification.adminScoreOverride` are set manually in Firestore — no admin UI (same convention as the manual admin-role grant).** True private-data enforcement requires Firestore/Storage security rules configured in the Firebase console (out of repo).

### Path aliases (tsconfig.json)

`@comps/* → components/*`, `@/* → ./*`, `@utils/* → utils/*`, `@firebase/*` & `fb/* → firebase/*`, `Inputs/* → components/Inputs/*`, `@context → context/*`.

### Other

- `next.config.mjs`: `next/image` `remotePatterns` (firebasestorage, lh3.googleusercontent, images.unsplash, img.icons8); security headers (CSP-adjacent: X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS); long-lived cache headers for static assets. **No `next-pwa`** — PWA manifest is the static `public/manifest.json`.
- App-wide constants in `CONSTANTS/` (`ROUTES.js` drives nav, `SWIMMING_TESTS.js`, `AWARDS.js`, `STATUS_EVENT.js`).
