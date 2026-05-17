# Spec — Landing page + app moved to /dashboard

Date: 2026-05-16
Status: approved (design + 4 craft deviations signed off)
Branch: `pre` (also synced to `phase-1-modernize`)
Context refs: `docs/PRODUCT.md`, `docs/DESIGN.md`

## Goal

Public premium marketing landing at `/` (validate: would people book swim
coaches from an app). Move the existing authenticated app under `/dashboard/*`
with its own app-chrome layout. Landing is the SEO surface; app is noindex.

## Decisions (locked)

- **Logo**: `public/logo-nadamas.png` (real logo, used in nav + footer).
- **Stack**: Next 16 App Router, TS, Tailwind + daisyUI. Zero new deps. No
  shadcn, no framer-motion. Motion = CSS / Web Animations, scroll-driven,
  ease-out-expo/quint, reduced-motion respected.
- **Routing/SEO**: subdirectory split (better than subdomain — keeps domain
  authority). `/` static (SSG/ISR). `/dashboard/*` `noindex` + robots
  disallow.
- **4 craft deviations from brief** (approved): (1) glass = at most one
  purposeful element, not a system; (2) gradient in backgrounds/glow only,
  never `background-clip:text`; (3) no identical card grids — varied-size
  marketplace cards, varied-rhythm features, editorial social proof (no
  hero-metric block); (4) no em dashes in copy.

## Architecture

```
app/
  layout.tsx              # slim: <html><body> + Providers only
  (marketing)/
    layout.tsx            # landing sticky nav + premium footer, no app chrome
    page.tsx              # / landing (static, full SEO: metadata, OG, JSON-LD)
  (app)/
    dashboard/
      layout.tsx          # existing app Layout (Navbar + BottomNav)
      page.tsx            # /dashboard app home
      events/...          # relocate migrated events routes
      profile/page.tsx    # relocate
  login/page.tsx          # root, no chrome
  logout/page.tsx
```

- Root `layout.tsx` drops the global app `Layout` wrapper (currently in
  `app/providers.tsx`). `Providers` keeps UserProvider + ThemeProvider only;
  the app `Layout` chrome moves into `(app)/dashboard/layout.tsx`.
- Auth redirect target changes `/login?...` → post-login `/dashboard`.
  `useUser`-gated pages live under `(app)`.
- Internal links/imports updated: `/events*` → `/dashboard/events*`,
  `/profile` → `/dashboard/profile`. `@comps/events/*` unaffected.
- `robots`: disallow `/dashboard`. `sitemap` lists marketing routes only.

## Landing components (kebab-case files, `components/marketing/`)

Reusable, small, single-purpose:

- `site-nav.tsx` — sticky premium nav: real logo, links (Inicio, Coaches,
  Cómo funciona, Para coaches, FAQ), highlighted CTA.
- `hero.tsx` — editorial headline + sub + primary CTA "Encontrar coach" +
  secondary "Publicar mi perfil" + micro social proof + app mockup framed in
  brand gradient.
- `social-proof.tsx` — inline editorial line + avatar faces + 3 honest
  metrics inline (NOT big-number template).
- `how-it-works.tsx` — two tracks (swimmer 1-2-3 / coach 1-2-3), scroll
  reveal.
- `marketplace-preview.tsx` — varied-size coach cards (photo, specialty,
  rating, price, availability): Aguas abiertas, Triatlón, Principiantes,
  Técnica, Niños.
- `features.tsx` — varied-rhythm layout (not 6 identical tiles): reserva en
  segundos, coaches verificados, pagos seguros, horarios en tiempo real,
  seguimiento, historial.
- `for-coaches.tsx` — problem (WhatsApp/manual) → solution narrative, CTA
  "Publicar mi perfil".
- `product-shots.tsx` — iPhone mockups: marketplace home, coach profile,
  bookings, calendar, history.
- `faq.tsx` — accordion: cómo pago, cancelar, ser coach, tipos de clase,
  privadas.
- `final-cta.tsx` — emotional aspirational close.
- `site-footer.tsx` — minimal premium footer.

Headline candidates (hero, pick 1 in build, not literal from brief):
- "Tu próximo coach de natación, a un toque."
- "Encuentra coaches verificados. Reserva en minutos."
- "Nada mejor. Con el coach indicado."

## Visual system

Per `docs/DESIGN.md`. Committed color strategy, Ice White dominant, Deep
Ocean structure/type, Aqua single interactive accent, brand gradient
deliberate (hero backdrop, CTA glow, mockup frame, curved section seams).
Editorial large type, rounded-grotesk display echoing the wordmark. Wave-
ribbon motif + forward diagonal motion from the isotype. Soft wide low
shadows. Light theme only.

## Non-goals

- No real marketplace/booking backend (landing is aspirational validation).
- No dark mode for landing.
- No new runtime dependencies.
- No redesign of the in-app screens this pass (only relocation under
  `/dashboard`).

## Acceptance

- `/` renders landing, statically generated, no app chrome, Lighthouse-
  friendly (LCP fast), has metadata + OG + JSON-LD, real logo present.
- App reachable at `/dashboard/*`; old `/events`,`/profile` redirect or move.
- `/dashboard/*` noindex; robots disallows it; sitemap = marketing only.
- `yarn typecheck` clean; `yarn build` green; all marketing files kebab-case.
- Deploy via git push (pre branch) — never `vercel deploy` CLI.
- Visual: passes the AI-slop / category-reflex test; none of the 4 banned
  cliché patterns present.
