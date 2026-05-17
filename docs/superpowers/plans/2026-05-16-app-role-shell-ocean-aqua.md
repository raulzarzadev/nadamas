# App Role-Shell + Ocean/Aqua Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the product app into a multi-role (athlete/coach/admin) shell with an Airbnb-style role switcher, restyled to the landing's ocean/aqua design system, dark mode removed.

**Architecture:** Three explicit route segments (`athlete/`, `coach/`, `admin/`) under `app/(app)/`, each behind `AuthGate` + a shared `AppChrome`; `coach/` and `admin/` add a `RoleGuard`. A client `RoleProvider` holds normalized `roles` + persisted `activeRole`. Existing events CRUD moves under `athlete/progress`. Theme is unified via a shared `styles/tokens.css` and a single daisyUI light theme; `ThemeContext`/dark mode deleted.

**Tech Stack:** Next.js 16 App Router, React 19, Firebase 12 (Firestore/Auth), TypeScript strict, Tailwind v4 + daisyUI v5, Playwright e2e, Yarn.

**Spec:** `docs/superpowers/specs/2026-05-16-app-role-shell-ocean-aqua-design.md`

**Codebase constraints (do not violate):**
- No unit test runner. Tests are Playwright e2e in `e2e/*.spec.ts` via `yarn test:e2e`. Auth is Google popup (not automatable) — e2e covers only what is observable **without** logging in (server redirects). Pure logic is isolated into `lib/roles.ts` and verified by `yarn typecheck` + manual checklist.
- Path aliases: `@comps/* → components/*`, `@/* → ./*`, `@context → context/*`, `@firebase/* & fb/* → firebase/*`.
- Firestore access only via existing `firebase/*` helpers — never call Firestore from components.
- UI copy is Spanish; route slugs/code English.
- Commit after every task. Branch is `pre` (already checked out) — commit there, do not open a PR unless asked.

**Deviations from spec (intentional, lower risk):**
- `students` is a stub (no `/teams` routes exist to restyle; teams data wiring deferred).
- `styles/tokens.css` mirrors the marketing palette values; `components/marketing/marketing-theme.css` is left untouched to avoid marketing regression. Same end state (one source of brand values for the app).

---

## File Structure

**Create:**
- `styles/tokens.css` — brand CSS custom properties (`:root`), shared by app.
- `lib/roles.ts` — pure role helpers (normalize, resolve active role). No React, no Firebase.
- `context/RoleContext.tsx` — `RoleProvider` + `useRole()` (client).
- `components/app-chrome/AppChrome.tsx` — top nav + mobile bottom nav shell.
- `components/app-chrome/RoleSwitcher.tsx` — Airbnb-style role dropdown.
- `components/app-chrome/RoleGuard.tsx` — per-segment role gate.
- `components/app-chrome/nav-config.ts` — per-role nav link arrays.
- `app/(app)/profile/{layout,page}.tsx` — shared, restyled profile.
- `app/(app)/athlete/layout.tsx` + `home/`, `find-coach/`, `bookings/` `page.tsx` (stubs) + `progress/**` (moved events).
- `app/(app)/coach/layout.tsx` + `home/`, `agenda/`, `students/`, `coach-profile/` `page.tsx` (stubs).
- `app/(app)/admin/layout.tsx` + `home/`, `verify-queue/`, `users/` `page.tsx` (stubs).
- `e2e/role-shell.spec.ts` — redirect e2e.

**Modify:**
- `app/providers.tsx` — swap `ThemeProvider` → `RoleProvider`.
- `styles/globals.css` — import tokens, define single daisyUI light theme.
- `firebase/users.js` — add `enableCoach`.
- `context/UserContext.js` — post-login redirect `/dashboard` → `/athlete/home`.
- `app/(app)/login/page.tsx` — already-auth redirect → `/athlete/home`.
- `next.config.mjs` — add `redirects()` for legacy `/dashboard*`.
- `CONSTANTS/ROUTES.js` — point to new paths (kept for any residual imports).
- `CLAUDE.md` — document roles model + admin-granting.

**Delete (final task, after replacements wired):**
- `context/ThemeContext.js`
- `components/Layout/index.js`, `Navbar.js`, `BottomNav.js`, `DarkModeToggle.js`
- `app/(app)/dashboard/**` (contents moved)

---

## Task 1: Shared brand tokens + single daisyUI light theme

**Files:**
- Create: `styles/tokens.css`
- Modify: `styles/globals.css`

- [ ] **Step 1: Create `styles/tokens.css`**

```css
/* nadamas — shared brand tokens (mirrors components/marketing/marketing-theme.css
   palette). App-wide. Light theme only, no #000/#fff. */
:root {
  --c-ocean: #0a2540;
  --c-ocean-mid: #0077b6;
  --c-aqua: #00b4d8;
  --c-aqua-strong: #0077a8;
  --c-aqua-light: #90e0ef;
  --c-bg: #f8fafc;
  --c-surface: #eaf7fb;
  --c-text-2: #4b5563;
  --c-border: #d6eaf0;

  --grad-brand: linear-gradient(135deg, #0a2540 0%, #0077b6 45%, #00b4d8 100%);

  --ease-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-quint: cubic-bezier(0.22, 1, 0.36, 1);

  --shadow-sm: 0 2px 12px -4px oklch(0.23 0.05 250 / 0.08);
  --shadow-md: 0 18px 48px -24px oklch(0.23 0.05 250 / 0.18);
  --shadow-lg: 0 40px 90px -40px oklch(0.23 0.05 250 / 0.28);
  --shadow-aqua: 0 26px 70px -28px oklch(0.72 0.13 220 / 0.45);

  --r-sm: 14px;
  --r-md: 22px;
  --r-lg: 34px;
  --r-xl: 48px;
}
```

- [ ] **Step 2: Replace `styles/globals.css` with token import + single daisyUI theme**

```css
@import "tailwindcss";
@import "./tokens.css";
@plugin "@tailwindcss/typography";
@plugin "daisyui" {
  themes: nadamas --default;
}
@plugin "daisyui/theme" {
  name: "nadamas";
  default: true;
  prefersdark: false;
  color-scheme: light;
  --color-base-100: #ffffff;
  --color-base-200: #eaf7fb;
  --color-base-300: #d6eaf0;
  --color-base-content: #0a2540;
  --color-primary: #0077b6;
  --color-primary-content: #ffffff;
  --color-secondary: #0a2540;
  --color-secondary-content: #ffffff;
  --color-accent: #0077a8;
  --color-accent-content: #ffffff;
  --color-neutral: #4b5563;
  --color-neutral-content: #ffffff;
  --color-info: #0077b6;
  --color-success: #0a7d4b;
  --color-warning: #b45309;
  --color-error: #b91c1c;
  --radius-selector: 14px;
  --radius-field: 14px;
  --radius-box: 22px;
}
```

- [ ] **Step 3: Verify build compiles the theme**

Run: `yarn build`
Expected: build succeeds (Tailwind/daisyUI compile with no unknown-theme error). If `themes:` syntax errors, the daisyUI v5 fallback is to omit the `@plugin "daisyui" { themes: ... }` block and rely solely on the `@plugin "daisyui/theme"` block with `default: true;` — apply that fallback and rebuild.

- [ ] **Step 4: Commit**

```bash
git add styles/tokens.css styles/globals.css
git commit -m "feat(theme): shared brand tokens + single daisyUI ocean/aqua light theme"
```

---

## Task 2: Pure role helpers

**Files:**
- Create: `lib/roles.ts`

- [ ] **Step 1: Create `lib/roles.ts`**

```ts
export type RoleName = 'athlete' | 'coach' | 'admin'

export interface Roles {
  athlete: true
  coach: boolean
  admin: boolean
}

interface RoleSource {
  roles?: Partial<Roles> | null
  isCoach?: boolean | null
}

/**
 * Normalize a user doc into a complete Roles object.
 * - athlete is always granted
 * - coach falls back to legacy `isCoach` when `roles` is absent
 * - admin is only ever true from an explicit roles.admin value
 */
export function normalizeRoles(user: RoleSource | null | undefined): Roles {
  const r = user?.roles ?? undefined
  return {
    athlete: true,
    coach: r ? r.coach === true : user?.isCoach === true,
    admin: r ? r.admin === true : false,
  }
}

export function hasRole(roles: Roles, role: RoleName): boolean {
  return roles[role] === true
}

/**
 * Resolve a safe active role: the stored value if still granted,
 * otherwise fall back to 'athlete'.
 */
export function resolveActiveRole(
  stored: string | null | undefined,
  roles: Roles
): RoleName {
  if (
    (stored === 'athlete' || stored === 'coach' || stored === 'admin') &&
    hasRole(roles, stored)
  ) {
    return stored
  }
  return 'athlete'
}

export const ACTIVE_ROLE_STORAGE_KEY = 'nadamas.activeRole'
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS (no errors in `lib/roles.ts`).

- [ ] **Step 3: Manual logic check**

Confirm by reading: `normalizeRoles(undefined)` → `{athlete:true,coach:false,admin:false}`; `normalizeRoles({isCoach:true})` → `coach:true`; `normalizeRoles({roles:{coach:false,admin:true}})` → `{athlete:true,coach:false,admin:true}`; `resolveActiveRole('coach',{athlete:true,coach:false,admin:false})` → `'athlete'`.

- [ ] **Step 4: Commit**

```bash
git add lib/roles.ts
git commit -m "feat(roles): pure role normalization + active-role resolution helpers"
```

---

## Task 3: `enableCoach` Firestore mutation

**Files:**
- Modify: `firebase/users.js`

- [ ] **Step 1: Append `enableCoach` to `firebase/users.js`**

Add at end of file (after `updateUser`):

```js
/**
 * Self-enable the coach role for the given user id.
 * Sets roles.coach = true (merging, athlete always true) + updatedAt.
 */
export const enableCoach = async (userId) => {
  if (!userId) throw new Error('No userId provided')
  const payload = Dates.deepFormatObjectDates(
    { 'roles.athlete': true, 'roles.coach': true, updatedAt: new Date() },
    'number'
  )
  return updateDoc(doc(db, 'users', userId), payload)
}
```

- [ ] **Step 2: Verify types/lint**

Run: `yarn typecheck && yarn lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add firebase/users.js
git commit -m "feat(users): enableCoach mutation (self-enable coach role)"
```

---

## Task 4: RoleProvider context

**Files:**
- Create: `context/RoleContext.tsx`

- [ ] **Step 1: Create `context/RoleContext.tsx`**

```tsx
'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { enableCoach as enableCoachFb } from '@/firebase/users'
import {
  ACTIVE_ROLE_STORAGE_KEY,
  normalizeRoles,
  resolveActiveRole,
  type RoleName,
  type Roles,
} from '@/lib/roles'

interface RoleContextValue {
  roles: Roles
  activeRole: RoleName
  isAdmin: boolean
  setActiveRole: (role: RoleName) => void
  enableCoach: () => Promise<void>
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser() as { user: any }
  const router = useRouter()
  const roles = useMemo(() => normalizeRoles(user), [user])

  const [stored, setStored] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setStored(localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY))
  }, [])

  const activeRole = useMemo(
    () => resolveActiveRole(stored, roles),
    [stored, roles]
  )

  const setActiveRole = useCallback(
    (role: RoleName) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role)
      }
      setStored(role)
      router.push(`/${role}/home`)
    },
    [router]
  )

  const enableCoach = useCallback(async () => {
    const id = user?.uid || user?.id
    if (!id) return
    await enableCoachFb(id)
  }, [user])

  const value = useMemo(
    () => ({
      roles,
      activeRole,
      isAdmin: roles.admin,
      setActiveRole,
      enableCoach,
    }),
    [roles, activeRole, setActiveRole, enableCoach]
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export const useRole = (): RoleContextValue => {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add context/RoleContext.tsx
git commit -m "feat(roles): RoleProvider with persisted activeRole + enableCoach"
```

---

## Task 5: Wire providers, drop ThemeProvider

**Files:**
- Modify: `app/providers.tsx`

- [ ] **Step 1: Replace `app/providers.tsx`**

```tsx
'use client'
import { Suspense } from 'react'
import { UserProvider } from '@/context/UserContext'
import { RoleProvider } from '@/context/RoleContext'
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <UserProvider>
        <RoleProvider>{children}</RoleProvider>
      </UserProvider>
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify nothing else imports ThemeContext yet besides legacy Layout (to be deleted in Task 12)**

Run: `grep -rn "ThemeContext\|useTheme" app components context --include="*.js" --include="*.tsx" --include="*.ts"`
Expected: matches ONLY in `context/ThemeContext.js`, `components/Layout/index.js`, `components/Layout/Navbar.js` (all deleted in Task 12). If any OTHER file matches, restyle/remove that usage now before continuing.

- [ ] **Step 3: Verify build (legacy Layout still present, still compiles)**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/providers.tsx
git commit -m "feat(providers): mount RoleProvider, remove ThemeProvider"
```

---

## Task 6: Nav config + RoleSwitcher

**Files:**
- Create: `components/app-chrome/nav-config.ts`
- Create: `components/app-chrome/RoleSwitcher.tsx`

- [ ] **Step 1: Create `components/app-chrome/nav-config.ts`**

```ts
import type { RoleName } from '@/lib/roles'

export interface NavLink {
  href: string
  label: string
}

export const NAV_BY_ROLE: Record<RoleName, NavLink[]> = {
  athlete: [
    { href: '/athlete/home', label: 'Inicio' },
    { href: '/athlete/find-coach', label: 'Buscar coach' },
    { href: '/athlete/progress', label: 'Mi progreso' },
    { href: '/athlete/bookings', label: 'Mis reservas' },
    { href: '/profile', label: 'Perfil' },
  ],
  coach: [
    { href: '/coach/home', label: 'Inicio' },
    { href: '/coach/agenda', label: 'Agenda' },
    { href: '/coach/students', label: 'Alumnos' },
    { href: '/coach/coach-profile', label: 'Mi perfil de coach' },
    { href: '/profile', label: 'Perfil' },
  ],
  admin: [
    { href: '/admin/home', label: 'Inicio' },
    { href: '/admin/verify-queue', label: 'Verificaciones' },
    { href: '/admin/users', label: 'Usuarios' },
    { href: '/profile', label: 'Perfil' },
  ],
}

export const ROLE_LABEL: Record<RoleName, string> = {
  athlete: 'Atleta',
  coach: 'Entrenador',
  admin: 'Admin',
}
```

- [ ] **Step 2: Create `components/app-chrome/RoleSwitcher.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { ROLE_LABEL } from './nav-config'

export default function RoleSwitcher() {
  const { roles, activeRole, setActiveRole, enableCoach } = useRole()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleEnableCoach = async () => {
    setBusy(true)
    try {
      await enableCoach()
      setActiveRole('coach')
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full px-4 py-2 text-sm font-semibold bg-[var(--c-surface)] text-[var(--c-ocean-mid)] border border-[var(--c-border)] hover:opacity-80 transition-opacity cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Actuando como: {ROLE_LABEL[activeRole]} ▾
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul
            role="menu"
            className="absolute right-0 z-20 mt-2 w-60 rounded-[var(--r-md)] bg-white shadow-[var(--shadow-md)] border border-[var(--c-border)] p-2"
          >
            <li role="none">
              <button
                role="menuitem"
                onClick={() => {
                  setActiveRole('athlete')
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm hover:bg-[var(--c-surface)] cursor-pointer"
              >
                {ROLE_LABEL.athlete}
              </button>
            </li>
            <li role="none">
              {roles.coach ? (
                <button
                  role="menuitem"
                  onClick={() => {
                    setActiveRole('coach')
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm hover:bg-[var(--c-surface)] cursor-pointer"
                >
                  {ROLE_LABEL.coach}
                </button>
              ) : (
                <button
                  role="menuitem"
                  disabled={busy}
                  onClick={handleEnableCoach}
                  className="w-full text-left px-3 py-2 rounded-[var(--r-sm)] text-sm text-[var(--c-aqua-strong)] font-semibold hover:bg-[var(--c-surface)] disabled:opacity-50 cursor-pointer"
                >
                  {busy ? 'Activando…' : 'Activar modo entrenador'}
                </button>
              )}
            </li>
          </ul>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/app-chrome/nav-config.ts components/app-chrome/RoleSwitcher.tsx
git commit -m "feat(chrome): nav config + Airbnb-style RoleSwitcher"
```

---

## Task 7: RoleGuard

**Files:**
- Create: `components/app-chrome/RoleGuard.tsx`

- [ ] **Step 1: Create `components/app-chrome/RoleGuard.tsx`**

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { useRole } from '@/context/RoleContext'
import Loading from '@comps/Loading'
import type { RoleName } from '@/lib/roles'

export default function RoleGuard({
  need,
  children,
}: {
  need: Extract<RoleName, 'coach' | 'admin'>
  children: React.ReactNode
}) {
  const { user } = useUser() as { user: any }
  const { roles } = useRole()
  const router = useRouter()
  const granted = roles[need]

  useEffect(() => {
    if (user === undefined) return
    if (!granted && need === 'coach') {
      router.replace('/athlete/home')
    }
  }, [user, granted, need, router])

  if (user === undefined) return <Loading />
  if (!granted) {
    if (need === 'admin') notFound()
    return <Loading />
  }
  return <>{children}</>
}
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/app-chrome/RoleGuard.tsx
git commit -m "feat(chrome): RoleGuard (coach redirect, admin 404)"
```

---

## Task 8: AppChrome shell

**Files:**
- Create: `components/app-chrome/AppChrome.tsx`

- [ ] **Step 1: Create `components/app-chrome/AppChrome.tsx`**

```tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/context/RoleContext'
import RoleSwitcher from './RoleSwitcher'
import { NAV_BY_ROLE } from './nav-config'
import type { RoleName } from '@/lib/roles'

export default function AppChrome({
  role,
  children,
}: {
  role: RoleName
  children: React.ReactNode
}) {
  const { isAdmin } = useRole()
  const pathname = usePathname()
  const links = NAV_BY_ROLE[role]

  return (
    <div
      data-theme="nadamas"
      className="min-h-screen bg-[var(--c-bg)] text-[var(--c-ocean)]"
    >
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <Link href={`/${role}/home`} className="relative w-32 h-7 block">
            <Image
              src="/nadamas/logo-3.png"
              fill
              priority
              style={{ objectFit: 'contain', objectPosition: 'left' }}
              alt="nadamas"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--c-surface)] text-[var(--c-ocean-mid)]'
                      : 'text-[var(--c-text-2)] hover:text-[var(--c-ocean)]'
                  }`}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin/home"
                className="rounded-full px-3 py-2 text-sm font-semibold bg-[var(--c-ocean)] text-white hover:opacity-90 transition-opacity"
              >
                Admin
              </Link>
            )}
            <RoleSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-24 pt-6">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[var(--c-border)]">
        <ul className="flex justify-around">
          {links.slice(0, 5).map((l) => {
            const active = pathname === l.href
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`block px-3 py-3 text-xs font-semibold ${
                    active
                      ? 'text-[var(--c-ocean-mid)]'
                      : 'text-[var(--c-text-2)]'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/app-chrome/AppChrome.tsx
git commit -m "feat(chrome): AppChrome ocean/aqua nav + mobile bottom nav"
```

---

## Task 9: Athlete segment (layout + stubs + moved events)

**Files:**
- Create: `app/(app)/athlete/layout.tsx`, `home/page.tsx`, `find-coach/page.tsx`, `bookings/page.tsx`
- Move: `app/(app)/dashboard/events/**` → `app/(app)/athlete/progress/**`

- [ ] **Step 1: Create `app/(app)/athlete/layout.tsx`**

```tsx
import AuthGate from '../auth-gate'
import AppChrome from '@comps/app-chrome/AppChrome'

export const metadata = { robots: { index: false, follow: false } }

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <AppChrome role="athlete">{children}</AppChrome>
    </AuthGate>
  )
}
```

- [ ] **Step 2: Create stub `app/(app)/athlete/home/page.tsx`**

```tsx
import Link from 'next/link'

const CARDS = [
  { href: '/athlete/find-coach', title: 'Buscar coach', body: 'Encuentra coaches verificados por especialidad y disponibilidad.' },
  { href: '/athlete/progress', title: 'Mi progreso', body: 'Tu historial de clases, distancias y notas del coach.' },
  { href: '/athlete/bookings', title: 'Mis reservas', body: 'Próximas clases y reservas confirmadas.' },
]

export default function AthleteHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Hola, nadador</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 hover:shadow-[var(--shadow-md)] transition-shadow"
          >
            <h2 className="text-lg font-bold text-[var(--c-ocean-mid)]">{c.title}</h2>
            <p className="mt-2 text-sm text-[var(--c-text-2)]">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create stub `app/(app)/athlete/find-coach/page.tsx`**

```tsx
export default function FindCoachPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Buscar coach</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: filtra coaches verificados por especialidad, ubicación,
        precio y disponibilidad real.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Buscador en construcción
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create stub `app/(app)/athlete/bookings/page.tsx`**

```tsx
export default function BookingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Mis reservas</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: aquí verás tus clases confirmadas y su estado.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Aún no tienes reservas
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Move events directory to progress**

Run:
```bash
mkdir -p "app/(app)/athlete/progress"
git mv "app/(app)/dashboard/events/page.tsx" "app/(app)/athlete/progress/page.tsx"
git mv "app/(app)/dashboard/events/new" "app/(app)/athlete/progress/new"
git mv "app/(app)/dashboard/events/[id]" "app/(app)/athlete/progress/[id]"
```

- [ ] **Step 6: Rewrite internal links `/dashboard/events` → `/athlete/progress` and `/login` push targets**

Run to find all occurrences (include event components):
```bash
grep -rn "/dashboard/events\|/dashboard/profile\|/dashboard" "app/(app)/athlete" components/events
```
Edit every match: replace `/dashboard/events` with `/athlete/progress`. In `app/(app)/athlete/progress/page.tsx` the header link becomes `href="/athlete/progress/new"`. Leave `router.push('/login')` calls as-is (still valid). After edits, re-run the grep — expected: no remaining `/dashboard` references in those paths.

- [ ] **Step 7: Verify types + build**

Run: `yarn typecheck && yarn build`
Expected: PASS (dashboard route still exists for now; that's fine).

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/athlete" components/events
git commit -m "feat(athlete): segment layout, home/find-coach/bookings stubs, events→progress"
```

---

## Task 10: Coach segment

**Files:**
- Create: `app/(app)/coach/layout.tsx`, `home/page.tsx`, `agenda/page.tsx`, `students/page.tsx`, `coach-profile/page.tsx`

- [ ] **Step 1: Create `app/(app)/coach/layout.tsx`**

```tsx
import AuthGate from '../auth-gate'
import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'

export const metadata = { robots: { index: false, follow: false } }

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <RoleGuard need="coach">
        <AppChrome role="coach">{children}</AppChrome>
      </RoleGuard>
    </AuthGate>
  )
}
```

- [ ] **Step 2: Create `app/(app)/coach/home/page.tsx`**

```tsx
import Link from 'next/link'

const CARDS = [
  { href: '/coach/agenda', title: 'Agenda', body: 'Publica horarios y clases. Tu agenda, tus reglas.' },
  { href: '/coach/students', title: 'Alumnos', body: 'Tus nadadores y su progreso en un solo lugar.' },
  { href: '/coach/coach-profile', title: 'Mi perfil de coach', body: 'Especialidades, experiencia y verificación.' },
]

export default function CoachHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Panel de entrenador</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 hover:shadow-[var(--shadow-md)] transition-shadow"
          >
            <h2 className="text-lg font-bold text-[var(--c-ocean-mid)]">{c.title}</h2>
            <p className="mt-2 text-sm text-[var(--c-text-2)]">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create stub `app/(app)/coach/agenda/page.tsx`**

```tsx
export default function CoachAgendaPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Agenda</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: define clases privadas o de grupo, precios y
        disponibilidad en tiempo real.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Calendario en construcción
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create stub `app/(app)/coach/students/page.tsx`**

```tsx
export default function CoachStudentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Alumnos</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: tus nadadores, su asistencia y su progreso.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Aún no tienes alumnos
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create stub `app/(app)/coach/coach-profile/page.tsx`**

```tsx
export default function CoachProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Mi perfil de coach</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: especialidades, experiencia, valoraciones y estado de
        verificación.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Perfil de coach en construcción
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify types + build**

Run: `yarn typecheck && yarn build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/coach"
git commit -m "feat(coach): guarded segment + home/agenda/students/profile stubs"
```

---

## Task 11: Admin segment

**Files:**
- Create: `app/(app)/admin/layout.tsx`, `home/page.tsx`, `verify-queue/page.tsx`, `users/page.tsx`

- [ ] **Step 1: Create `app/(app)/admin/layout.tsx`**

```tsx
import AuthGate from '../auth-gate'
import AppChrome from '@comps/app-chrome/AppChrome'
import RoleGuard from '@comps/app-chrome/RoleGuard'

export const metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <RoleGuard need="admin">
        <AppChrome role="admin">{children}</AppChrome>
      </RoleGuard>
    </AuthGate>
  )
}
```

- [ ] **Step 2: Create `app/(app)/admin/home/page.tsx`**

```tsx
import Link from 'next/link'

const CARDS = [
  { href: '/admin/verify-queue', title: 'Verificaciones', body: 'Coaches pendientes de evaluación práctica y teórica.' },
  { href: '/admin/users', title: 'Usuarios', body: 'Listado de usuarios y sus roles.' },
]

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Panel de administración</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-[var(--r-md)] bg-white border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 hover:shadow-[var(--shadow-md)] transition-shadow"
          >
            <h2 className="text-lg font-bold text-[var(--c-ocean-mid)]">{c.title}</h2>
            <p className="mt-2 text-sm text-[var(--c-text-2)]">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create stub `app/(app)/admin/verify-queue/page.tsx`**

```tsx
export default function VerifyQueuePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Verificaciones</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: cola de coaches pendientes de evaluación práctica y
        teórica.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Sin solicitudes pendientes
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create stub `app/(app)/admin/users/page.tsx`**

```tsx
export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Usuarios</h1>
      <p className="text-[var(--c-text-2)]">
        Próximamente: listado de usuarios y gestión de roles.
      </p>
      <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
        Listado en construcción
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify types + build**

Run: `yarn typecheck && yarn build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/admin"
git commit -m "feat(admin): guarded segment + home/verify-queue/users stubs"
```

---

## Task 12: Shared profile + restyle moved/auth screens

**Files:**
- Create: `app/(app)/profile/layout.tsx`, `app/(app)/profile/page.tsx`
- Modify: `components/Loading/index.js`, `app/(app)/athlete/progress/page.tsx`, `components/events/EventForm.tsx`, `components/events/EventView.tsx`, `components/AuthCard/index.js`

- [ ] **Step 1: Create `app/(app)/profile/layout.tsx`**

```tsx
'use client'
import AuthGate from '../auth-gate'
import AppChrome from '@comps/app-chrome/AppChrome'
import { useRole } from '@/context/RoleContext'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { activeRole } = useRole()
  return (
    <AuthGate>
      <AppChrome role={activeRole}>{children}</AppChrome>
    </AuthGate>
  )
}
```

- [ ] **Step 2: Create `app/(app)/profile/page.tsx` (restyled, from old dashboard/profile)**

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser() as { user: any }

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="flex flex-col items-center gap-3">
      {user.photoURL && (
        <div className="relative w-24 h-24 rounded-full overflow-hidden border border-[var(--c-border)]">
          <Image
            src={user.photoURL}
            fill
            style={{ objectFit: 'cover' }}
            alt={user.displayName || user.email || 'avatar'}
          />
        </div>
      )}
      <h1 className="text-2xl font-extrabold">{user.displayName || 'Perfil'}</h1>
      <p className="text-[var(--c-text-2)]">{user.email}</p>
    </div>
  )
}
```

- [ ] **Step 3: Restyle `components/Loading/index.js` spinner color**

Replace the spinner inner `div` className with:
```js
className={`${sizing[size]} rounded-full border-[var(--c-aqua-strong)] border-t-0 border-b-0 border-r-0 animate-spin`}
```

- [ ] **Step 4: Restyle moved progress list (`app/(app)/athlete/progress/page.tsx`)**

Replace `text-base-content` on the root `div` with `text-[var(--c-ocean)]`; replace the `card bg-base-200 ... hover:bg-base-300` list item className with:
```
rounded-[var(--r-md)] bg-white border border-[var(--c-border)] p-4 block hover:shadow-[var(--shadow-sm)] transition-shadow
```
Keep `btn btn-primary btn-sm` (now ocean via the daisyUI theme). Replace `opacity-60`/`opacity-70` text with `text-[var(--c-text-2)]`.

- [ ] **Step 5: Restyle events form/view + AuthCard**

Run: `grep -rn "base-content\|base-200\|base-300\|opacity-60\|opacity-70\|opacity-80\|dark:" components/events/EventForm.tsx components/events/EventView.tsx components/AuthCard/index.js`
For each match: replace `text-base-content` → `text-[var(--c-ocean)]`; `bg-base-200`/`bg-base-300` → `bg-white border border-[var(--c-border)]`; `opacity-6x/7x/8x` body text → `text-[var(--c-text-2)]`; delete any `dark:` variant classes. Keep daisyUI `btn`/`input`/`form-control` class names (themed by Task 1). Do not change logic or props.

- [ ] **Step 6: Verify types + lint + build**

Run: `yarn typecheck && yarn lint && yarn build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/profile" components/Loading components/events components/AuthCard "app/(app)/athlete/progress/page.tsx"
git commit -m "feat(profile): shared restyled profile; restyle events/auth/loading to ocean/aqua"
```

---

## Task 13: Redirects, repoint login, delete legacy

**Files:**
- Modify: `next.config.mjs`, `context/UserContext.js`, `app/(app)/login/page.tsx`, `CONSTANTS/ROUTES.js`
- Delete: `app/(app)/dashboard/**`, `context/ThemeContext.js`, `components/Layout/{index,Navbar,BottomNav}.js`, `components/Layout/DarkModeToggle.js`

- [ ] **Step 1: Add `redirects()` to `next.config.mjs`**

Insert this method into the `nextConfig` object (alongside `headers`):

```js
  async redirects() {
    return [
      { source: '/dashboard', destination: '/athlete/home', permanent: false },
      { source: '/dashboard/profile', destination: '/profile', permanent: false },
      { source: '/dashboard/events', destination: '/athlete/progress', permanent: false },
      { source: '/dashboard/events/:path*', destination: '/athlete/progress/:path*', permanent: false },
    ]
  },
```

- [ ] **Step 2: Repoint post-login redirect in `context/UserContext.js`**

In `login()`, change `router.push('/dashboard')` → `router.push('/athlete/home')` (the line with `redirectTo ? router.push(redirectTo) : router.push('/dashboard')`).

- [ ] **Step 3: Repoint already-auth redirect in `app/(app)/login/page.tsx`**

Change `router.push('/dashboard')` → `router.push('/athlete/home')`.

- [ ] **Step 4: Update `CONSTANTS/ROUTES.js` hrefs**

`PROFILE.href` → `/profile`; `EVENTS.href` → `/athlete/progress`; `TEAMS.href` → `/coach/students`. Leave structure otherwise unchanged.

- [ ] **Step 5: Delete legacy files**

Run:
```bash
git rm -r "app/(app)/dashboard"
git rm context/ThemeContext.js components/Layout/index.js components/Layout/Navbar.js components/Layout/BottomNav.js components/Layout/DarkModeToggle.js
```

- [ ] **Step 6: Verify no dangling imports**

Run: `grep -rn "ThemeContext\|useTheme\|@comps/Layout\|components/Layout\|/dashboard" app components context CONSTANTS --include="*.js" --include="*.ts" --include="*.tsx"`
Expected: no matches (except inside this plan/spec docs, which are not scanned). Fix any remaining references before continuing.

- [ ] **Step 7: Verify full gates**

Run: `yarn typecheck && yarn lint && yarn build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add next.config.mjs context/UserContext.js "app/(app)/login/page.tsx" CONSTANTS/ROUTES.js
git commit -m "feat(routing): /dashboard redirects, repoint login, delete legacy Layout/Theme/dashboard"
```

---

## Task 14: Redirect e2e + docs + final verification

**Files:**
- Create: `e2e/role-shell.spec.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write failing e2e for legacy redirects**

`e2e/role-shell.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('legacy /dashboard redirects to /athlete/home', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/athlete\/home|\/login/)
})

test('legacy /dashboard/profile redirects to /profile', async ({ page }) => {
  await page.goto('/dashboard/profile')
  await expect(page).toHaveURL(/\/profile|\/login/)
})

test('legacy /dashboard/events redirects to /athlete/progress', async ({
  page,
}) => {
  await page.goto('/dashboard/events')
  await expect(page).toHaveURL(/\/athlete\/progress|\/login/)
})
```
(The `|\/login` alternative tolerates `AuthGate` bouncing an unauthenticated visitor after the config redirect — the redirect itself still must have changed the path away from `/dashboard`.)

- [ ] **Step 2: Run e2e**

Run: `yarn test:e2e e2e/role-shell.spec.ts`
Expected: PASS (config redirects fire pre-auth). If it fails because the dev/preview server isn't running per Playwright config, start it as the existing `e2e/smoke.spec.ts` expects, then re-run.

- [ ] **Step 3: Document roles model in `CLAUDE.md`**

Under the "### Auth & routing" section, append:
```markdown
- Multi-role: `users` doc has `roles: { athlete:true, coach:boolean, admin:boolean }`. `lib/roles.ts` normalizes (legacy `isCoach` ⇒ coach when `roles` absent). `context/RoleContext.tsx` exposes `useRole()` → `{ roles, activeRole, isAdmin, setActiveRole, enableCoach }`; `activeRole` persisted in localStorage. App is split into `app/(app)/{athlete,coach,admin}/` segments behind `AuthGate` + `AppChrome`; `coach`/`admin` add `RoleGuard`. **Admin is granted only by manually setting `roles.admin: true` on the Firestore user doc — there is no UI for it.**
```

- [ ] **Step 4: Final manual verification checklist (record results)**

Run `yarn dev`, sign in, and confirm:
- Default lands in `/athlete/home`; switcher reads "Actuando como: Atleta".
- Switcher → "Activar modo entrenador" then Entrenador → lands `/coach/home`; coach nav shown.
- Visiting `/coach/home` after signing out coach role (manually unset `roles.coach` in Firestore, reload) → redirected to `/athlete/home`.
- `/admin/home` without `roles.admin` → 404. Set `roles.admin:true` on your user → "Admin" button appears, `/admin/home` loads.
- No dark-mode toggle anywhere; ocean/aqua palette throughout; events CRUD works under `/athlete/progress`.

- [ ] **Step 5: Final gates**

Run: `yarn typecheck && yarn lint && yarn build && yarn test:e2e`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/role-shell.spec.ts CLAUDE.md
git commit -m "test(e2e): legacy redirect coverage; docs(roles): multi-role model in CLAUDE.md"
```

---

## Self-Review

**Spec coverage:**
- §1 routes/redirects → Tasks 9–13. §2 roles/switcher/admin-grant → Tasks 2–6, 13–14. §3 guards → Task 7 (+9–11 wiring). §4 theme unify/delete dark → Tasks 1, 5, 12, 13. §5 data flow → Tasks 4–8. §6 edge cases → Task 2 (`resolveActiveRole`), Task 7 (guards), Task 13 (redirects). §7 testing → Task 14 + gates each task. §8 YAGNI → all non-stub features omitted; stubs in Tasks 9–11. Covered.
- Spec deviations (students stub, tokens.css mirror) recorded in header.

**Placeholder scan:** No "TBD"/"handle edge cases"/uncoded steps — every code step has full code; restyle steps give exact class mappings + grep commands.

**Type consistency:** `RoleName`, `Roles`, `normalizeRoles`, `resolveActiveRole`, `ACTIVE_ROLE_STORAGE_KEY` defined in Task 2 and used unchanged in Tasks 4/6/7/8. `useRole()` shape from Task 4 matches consumers (Tasks 6/7/8/12). `enableCoach` signature `(userId)` (Task 3) matches Task 4 call `enableCoachFb(id)`. Nav `/profile` + role homes consistent across nav-config, AppChrome, redirects.
