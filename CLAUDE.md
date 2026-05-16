# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`nadamas` — PWA for swim trainers/coaches tracking athlete performance. Next.js 12 (Pages Router), React 17, Firebase 9 (Firestore + Auth + Storage), TypeScript (loose: `strict: false`, `target: es5`), Tailwind + daisyUI. Yarn.

## Commands

```bash
yarn dev          # next dev
yarn build        # next build
yarn start        # next start (prod, after build)
yarn cy:open      # open Cypress runner (e2e only — no unit test framework)
yarn push-main    # build then push origin main
```

- No lint script and no unit test runner. Tests are Cypress e2e in `cypress/e2e/*.cy.ts` (run via `yarn cy:open`); they use `cypress-firebase` against real Firebase.
- Requires env var `NEXT_PUBLIC_FIREBASE_CONFIG` — a JSON string parsed in `firebase/index.js`. App fails at import without it.

## Conventions (from README)

- All route paths and all code in English. UI copy/labels are Spanish (see `CONSTANTS/ROUTES.js` `label` fields).

## Architecture

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

### Auth & routing

- `pages/_app.js` wraps everything in `UserProvider` → `ThemeProvider` → `Layout`.
- `context/UserContext.js` is the auth hub. `authStateChanged` (Google popup auth) drives `user` state: `undefined` = loading (renders global `<Loading />`, blocking the whole app), `null` = logged out, object = logged in. Exposes `useUser()` → `{ user, login, logout }`. Handles post-login redirect via `?redirectTo=` query param; logged-in users on `/` are pushed to `/profile`.
- Protect a page by wrapping its default export in `components/HOC/authRoute.js` — redirects to `/login?redirectTo=<path>` when no user. `components/HOC/RouteAccess.js` does role gating (`isAdmin` / `user`) for in-page sections.

### Path aliases (tsconfig.json)

`@comps/* → components/*`, `@/* → ./*`, `@utils/* → utils/*`, `@firebase/*` & `fb/* → firebase/*`, `Inputs/* → components/Inputs/*`, `@legasy/* → .legasy/src/components/*`, `@context → context/*`.

### Other

- PWA via `next-pwa` (config in `next.config.js` — note the file currently does `module.exports` twice; the second assignment with `images.domains` wins, so PWA wrapper config is effectively overwritten — be careful editing this).
- `next/image` remote domains are whitelisted in `next.config.js` (`firebasestorage.googleapis.com`, `lh3.googleusercontent.com`, etc.).
- App-wide constants in `CONSTANTS/` (`ROUTES.js` drives nav, `SWIMMING_TESTS.js`, `AWARDS.js`, `STATUS_EVENT.js`).
- `.legasy/` is archived old code reachable via the `@legasy/*` alias — legacy reference, not active.
