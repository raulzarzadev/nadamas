# Landing + /dashboard Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a premium public marketing landing at `/` and relocate the existing authenticated app under `/dashboard/*` with its own chrome layout.

**Architecture:** Next 16 App Router route groups: `(marketing)` (slim public layout, static, SEO) and `(app)` (existing Navbar/BottomNav chrome, auth-gated, noindex). Root layout reduced to `<html><body>` + providers. Landing built with Tailwind + daisyUI, zero new deps, CSS scroll-driven motion. Visual system per `docs/DESIGN.md`; brand context `docs/PRODUCT.md`.

**Tech Stack:** Next 16, TypeScript, Tailwind + daisyUI, Firebase (existing), CSS/Web Animations. No shadcn, no framer-motion.

**Verification model:** No unit-test runner exists (only Cypress e2e per CLAUDE.md). Each task verifies with `yarn typecheck`, `yarn build`, and route smoke (`curl -s -o /dev/null -w "%{http_code}"`). Visual tasks additionally require a manual/preview review against `docs/DESIGN.md` craft laws. Deploys happen by `git push` to `pre` (and `phase-1-modernize`) — NEVER `vercel deploy` (see memory `deploy-via-git-not-cli`).

**Branch:** work on `pre`. After each phase, sync `phase-1-modernize` (`git checkout phase-1-modernize && git merge --ff-only pre && git push && git checkout pre`).

---

## File Structure

```
app/
  layout.tsx                       # MODIFY: slim to <html><body>+Providers
  providers.tsx                    # MODIFY: drop app Layout wrapper
  (marketing)/
    layout.tsx                     # CREATE: site-nav + site-footer, no app chrome
    page.tsx                       # CREATE: landing composition + SEO metadata + JSON-LD
  (app)/
    layout.tsx                     # CREATE: wraps children in existing components/Layout
    dashboard/
      page.tsx                     # CREATE: app home (was app/page.tsx -> Home)
      events/page.tsx              # MOVE from app/events/*
      events/[id]/page.tsx         # MOVE
      events/[id]/edit/page.tsx    # MOVE
      events/new/page.tsx          # MOVE
      profile/page.tsx             # MOVE from app/profile
  login/page.tsx                   # MODIFY: redirect target -> /dashboard
  logout/page.tsx                  # unchanged location
  robots.ts                        # CREATE: disallow /dashboard
  sitemap.ts                       # CREATE: marketing routes only
components/marketing/              # CREATE: landing components (kebab-case)
  site-nav.tsx
  hero.tsx
  social-proof.tsx
  how-it-works.tsx
  marketplace-preview.tsx
  features.tsx
  for-coaches.tsx
  product-shots.tsx
  faq.tsx
  final-cta.tsx
  site-footer.tsx
  marketing-theme.css              # scoped design tokens (DESIGN.md palette)
context/UserContext.js             # MODIFY: post-login redirect -> /dashboard
```

---

## PHASE A — Routing split (foundation)

### Task A1: Route groups + slim root layout + app chrome layout

**Files:**
- Modify: `app/providers.tsx`
- Modify: `app/layout.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `app/(marketing)/layout.tsx` (temporary minimal; replaced in B0)

- [ ] **Step 1: Drop app Layout from providers**

`app/providers.tsx` — remove the `Layout` wrapper so chrome is per-route-group:

```tsx
'use client'
import { Suspense } from 'react'
import { UserProvider } from '@/context/UserContext'
import { ThemeProvider } from '@/context/ThemeContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <UserProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </UserProvider>
    </Suspense>
  )
}
```

- [ ] **Step 2: Keep root layout slim** (already mostly slim; confirm it only renders `<html><body><Providers>`). No change needed beyond Step 1 unless it imports Layout.

- [ ] **Step 3: Create `(app)/layout.tsx`** restoring app chrome only for the app group:

```tsx
import Layout from '@comps/Layout'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>
}
```

- [ ] **Step 4: Create temporary `(marketing)/layout.tsx`** (replaced in B0):

```tsx
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-base-100">{children}</div>
}
```

- [ ] **Step 5: Verify typecheck**

Run: `yarn typecheck`
Expected: clean (exit 0)

- [ ] **Step 6: Commit**

```bash
git add app/providers.tsx app/layout.tsx "app/(app)/layout.tsx" "app/(marketing)/layout.tsx"
git commit -m "feat: route groups (app)/(marketing); move app chrome out of root"
```

### Task A2: Relocate app routes under (app)/dashboard

**Files:**
- Move: `app/events/**` → `app/(app)/dashboard/events/**`
- Move: `app/profile/page.tsx` → `app/(app)/dashboard/profile/page.tsx`
- Create: `app/(app)/dashboard/page.tsx` (from old `app/page.tsx` Home)
- Delete: `app/page.tsx` (root `/` becomes landing in Phase B)
- Modify: any internal links `/events`→`/dashboard/events`, `/profile`→`/dashboard/profile`

- [ ] **Step 1: Git-move route folders**

```bash
mkdir -p "app/(app)/dashboard"
git mv app/events "app/(app)/dashboard/events"
git mv app/profile "app/(app)/dashboard/profile"
```

- [ ] **Step 2: Create `(app)/dashboard/page.tsx`**

```tsx
import Home from '@comps/Home'

export default function DashboardHome() {
  return <Home />
}
```

- [ ] **Step 3: Remove old root page**

```bash
git rm app/page.tsx
```

- [ ] **Step 4: Update internal links**

Run: `grep -rnE "href=['\"]/(events|profile)" app components --include=*.tsx --include=*.js`
For each hit, prefix with `/dashboard` (e.g. `href="/dashboard/events"`). Also update `app/(app)/dashboard/events/*` links between events pages (`/events/${id}` → `/dashboard/events/${id}`).

- [ ] **Step 5: Verify typecheck + build + routes**

Run: `yarn typecheck && yarn build`
Expected: clean; build emits `/dashboard`, `/dashboard/events`, `/dashboard/events/[id]`, `/dashboard/events/[id]/edit`, `/dashboard/events/new`, `/dashboard/profile`. No `/` route yet (acceptable until B).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: relocate app routes under /dashboard"
```

### Task A3: Auth redirect targets → /dashboard

**Files:**
- Modify: `context/UserContext.js`
- Modify: `app/login/page.tsx`
- Modify: `app/(app)/dashboard/profile/page.tsx`, `app/(app)/dashboard/events/page.tsx`, `app/(app)/dashboard/events/new/page.tsx`, `app/(app)/dashboard/events/[id]/edit/page.tsx`

- [ ] **Step 1: Find redirect logic**

Run: `grep -rnE "push\(['\"]/(login|profile|)['\"]|redirectTo|router.push\('/'\)" context/UserContext.js app/login/page.tsx`

- [ ] **Step 2: Update UserContext post-login redirect** — where it pushes logged-in users to `/profile` or `/`, change destination to `/dashboard`. Where it builds `/login?redirectTo=`, keep, but default landing for authed user on `/` is now the public landing (do NOT auto-push authed users away from `/`; only redirect the post-login flow to `/dashboard`).

- [ ] **Step 3: Update `app/login/page.tsx`** — on `user` present, `router.push('/dashboard')` instead of `/`.

- [ ] **Step 4: Update gated pages** — pages under `(app)/dashboard` that do `if (user === null) router.push('/login')` keep that; ensure none redirect to bare `/profile` (use `/dashboard/...`).

- [ ] **Step 5: Verify**

Run: `yarn typecheck && yarn build`
Expected: clean/green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: post-login redirect to /dashboard"
```

### Task A4: robots + sitemap

**Files:**
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`

- [ ] **Step 1: Create `app/robots.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/login', '/logout'] },
    sitemap: 'https://nadamas.app/sitemap.xml',
  }
}
```

- [ ] **Step 2: Create `app/sitemap.ts`** (marketing only)

```ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://nadamas.app/', changeFrequency: 'weekly', priority: 1 }]
}
```

- [ ] **Step 3: Verify**

Run: `yarn build`
Expected: green; `/robots.txt` and `/sitemap.xml` emitted.

- [ ] **Step 4: Commit + sync branches + push**

```bash
git add app/robots.ts app/sitemap.ts
git commit -m "feat: robots disallow /dashboard, marketing-only sitemap"
git push origin pre
git checkout phase-1-modernize && git merge --ff-only pre && git push origin phase-1-modernize && git checkout pre
```

- [ ] **Step 5: Smoke the pre branch deploy** (git-triggered)

Run (until ready): `until vercel ls nadamas --scope raulzarza 2>/dev/null | grep -qi 'Ready'; do sleep 12; done`
Then: `curl -s -o /dev/null -w "%{http_code}\n" https://nadamas-git-pre-raulzarza.vercel.app/dashboard`
Expected: 200. Confirms /dashboard live on stable alias.

---

## PHASE B — Landing build

> Visual code in tasks below is the structural scaffold (real, not placeholder). Premium craft refinement (spacing rhythm, motion curves, copy polish) happens during execution against `docs/DESIGN.md`. Every task ends: typecheck + build + commit. Banned patterns (DESIGN.md §Deviations): no glass system, no gradient text, no identical card grids, no em dashes.

### Task B0: Marketing layout + design tokens + fonts + logo

**Files:**
- Create: `components/marketing/marketing-theme.css`
- Modify: `app/(marketing)/layout.tsx`
- Asset: `public/logo-nadamas.png` (already committed)

- [ ] **Step 1: Create `marketing-theme.css`** — scoped tokens (no `#000/#fff`):

```css
.marketing {
  --c-ocean: #0A2540;
  --c-ocean-mid: #0077B6;
  --c-aqua: #00B4D8;
  --c-aqua-light: #90E0EF;
  --c-bg: #F8FAFC;
  --c-surface: #EAF7FB;
  --c-text-2: #4B5563;
  --c-border: #D6EAF0;
  --grad-brand: linear-gradient(135deg,#0A2540 0%,#0077B6 45%,#00B4D8 100%);
  --ease-expo: cubic-bezier(0.16,1,0.3,1);
  background: var(--c-bg);
  color: var(--c-ocean);
}
@media (prefers-reduced-motion: reduce) {
  .marketing * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 2: Replace `app/(marketing)/layout.tsx`**

```tsx
import './../../components/marketing/marketing-theme.css'
import SiteNav from '@comps/marketing/site-nav'
import SiteFooter from '@comps/marketing/site-footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing min-h-screen">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
```

(SiteNav/SiteFooter created in B1/B11; build will fail until then — that is expected; commit B0 after B1+B11 if executing strictly, or stub them now. Stub: export a function returning `null`.)

- [ ] **Step 3: Stub site-nav/site-footer** so B0 builds independently:

```tsx
// components/marketing/site-nav.tsx
export default function SiteNav() { return null }
// components/marketing/site-footer.tsx
export default function SiteFooter() { return null }
```

- [ ] **Step 4: Verify** `yarn typecheck && yarn build` → green (no `/` route still OK; landing page added in B12).
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: marketing layout + design tokens"`

### Tasks B1–B11: Landing components

Each task = one file in `components/marketing/`. Common contract per task:
- **Step 1:** Implement the component as a server component (default) unless it needs interactivity (`'use client'` only for `faq` accordion, `site-nav` mobile toggle). Use tokens from `marketing-theme.css` via `style`/Tailwind arbitrary values. Spanish UI copy. No em dashes.
- **Step 2:** `yarn typecheck` → clean.
- **Step 3:** `yarn build` → green.
- **Step 4:** `git add -A && git commit -m "feat(landing): <component>"`

Component specs (acceptance per `docs/superpowers/specs/2026-05-16-landing-and-dashboard-split-design.md` and DESIGN.md craft laws):

- [ ] **B1 `site-nav.tsx`** (`'use client'`) — sticky, transparent→solid Ocean on scroll, real `next/image` logo (`/logo-nadamas.png`), links: Inicio, Coaches, Cómo funciona, Para coaches, FAQ; primary CTA "Encontrar coach". Mobile: disclosure menu (no modal-first).
- [ ] **B2 `hero.tsx`** — editorial headline (choose: "Tu próximo coach de natación, a un toque."), subhead, primary CTA "Encontrar coach" (aqua), secondary "Publicar mi perfil" (ghost), micro social proof line, app mockup framed by brand gradient backdrop (gradient as background only). Asymmetric, large type.
- [ ] **B3 `social-proof.tsx`** — inline editorial sentence + overlapping avatar faces + 3 inline metrics (coaches, clases, ciudades). NOT a big-number hero-metric block.
- [ ] **B4 `how-it-works.tsx`** — two tracks: swimmer (Encuentra coach → Reserva horario → Entrena), coach (Publica horarios → Recibe reservas → Cobra automático). CSS scroll-reveal, ease-expo, reduced-motion safe.
- [ ] **B5 `marketplace-preview.tsx`** — varied-size cards (NOT uniform grid): coach photo, specialty (Aguas abiertas, Triatlón, Principiantes, Técnica, Niños), rating, price, availability. Airbnb editorial feel.
- [ ] **B6 `features.tsx`** — varied rhythm (alternating sizes/alignment, not 6 identical tiles): reserva en segundos, coaches verificados, pagos seguros, horarios en tiempo real, seguimiento, historial. Minimal iconography.
- [ ] **B7 `for-coaches.tsx`** — narrative: problem (WhatsApp, mensajes, pagos manuales) → solution (agenda, pagos, alumnos, horarios centralizados). CTA "Publicar mi perfil".
- [ ] **B8 `product-shots.tsx`** — iPhone-framed shots: marketplace home, coach profile, bookings, calendar, history. Use CSS device frame (no heavy asset). Subtle parallax (transform only).
- [ ] **B9 `faq.tsx`** (`'use client'`) — accordion (native `<details>` preferred): cómo pago, puedo cancelar, cómo ser coach, tipos de clase, son privadas.
- [ ] **B10 `final-cta.tsx`** — emotional aspirational close on brand-gradient band, single strong CTA.
- [ ] **B11 `site-footer.tsx`** — minimal premium: logo, columns (Producto, Coaches, Legal), copyright. Replace B0 stub.

After B1 and B11 replace their stubs, re-verify `yarn build` green.

### Task B12: Compose landing page + SEO

**Files:**
- Create: `app/(marketing)/page.tsx`

- [ ] **Step 1: Compose**

```tsx
import type { Metadata } from 'next'
import Hero from '@comps/marketing/hero'
import SocialProof from '@comps/marketing/social-proof'
import HowItWorks from '@comps/marketing/how-it-works'
import MarketplacePreview from '@comps/marketing/marketplace-preview'
import Features from '@comps/marketing/features'
import ForCoaches from '@comps/marketing/for-coaches'
import ProductShots from '@comps/marketing/product-shots'
import Faq from '@comps/marketing/faq'
import FinalCta from '@comps/marketing/final-cta'

export const metadata: Metadata = {
  title: 'nadamas.app — Encuentra y reserva tu coach de natación',
  description:
    'Descubre coaches de natación verificados, reserva en minutos y mejora tu técnica. Aguas abiertas, triatlón, principiantes y más.',
  openGraph: {
    title: 'nadamas.app — Tu próximo coach de natación, a un toque',
    description:
      'Coaches verificados, reserva en minutos, paga en la app. Aprende, mejora y entrena.',
    url: 'https://nadamas.app/',
    images: ['/logo-nadamas.png'],
    type: 'website',
  },
  alternates: { canonical: 'https://nadamas.app/' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'nadamas.app',
  url: 'https://nadamas.app',
  description: 'Marketplace premium para encontrar y reservar coaches de natación.',
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <MarketplacePreview />
      <Features />
      <ForCoaches />
      <ProductShots />
      <Faq />
      <FinalCta />
    </>
  )
}
```

- [ ] **Step 2: Verify** `yarn typecheck && yarn build`
Expected: clean; build emits `○ /` (static). Confirm `/dashboard/*` still present.

- [ ] **Step 3: Local visual review** — `yarn dev`, open `/`, check against DESIGN.md: light theme, Committed palette, no glass system, no gradient text, varied card sizes, no em dashes, reduced-motion works. Fix craft issues inline.

- [ ] **Step 4: Commit + sync + push**

```bash
git add -A
git commit -m "feat(landing): compose / page with SEO metadata + JSON-LD"
git push origin pre
git checkout phase-1-modernize && git merge --ff-only pre && git push origin phase-1-modernize && git checkout pre
```

### Task B13: Deploy verification (git-triggered)

- [ ] **Step 1:** Wait for pre deploy ready:
`until vercel ls nadamas --scope raulzarza 2>/dev/null | grep -qi 'Ready'; do sleep 12; done`
- [ ] **Step 2:** Smoke:
```bash
U=https://nadamas-git-pre-raulzarza.vercel.app
for p in / /dashboard /dashboard/events /login; do printf "%s -> " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "$U$p"; done
```
Expected: `/`→200, `/dashboard`→200, `/dashboard/events`→200, `/login`→200.
- [ ] **Step 3:** Verify `curl -s "$U/robots.txt"` disallows `/dashboard`; `curl -s "$U/sitemap.xml"` lists only `/`.
- [ ] **Step 4:** Confirm `pre.nadamas.app` serves landing once DNS propagated (no action; git-triggered).

---

## Self-Review

**Spec coverage:** routing split (A1-A3) ✓; SEO noindex/robots/sitemap (A4) ✓; 11 components (B1-B11) ✓; visual system + deviations (B0 tokens, per-task constraints) ✓; logo (B0/B1) ✓; deploy via git (A4/B12/B13) ✓; non-goals respected (no backend, no deps, no dark mode) ✓.

**Placeholder scan:** component visual code is scaffold-by-spec with concrete acceptance, not "TODO"; refinement explicitly scoped to execution per DESIGN.md. No "TBD".

**Type consistency:** import alias `@comps/marketing/*` consistent; component default exports; layout import paths match route-group nesting.

**Gap note:** No unit tests by design (no runner). Verification = typecheck + build + curl smoke + visual review, stated per task.
