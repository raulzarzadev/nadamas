# SEO Action Plan — nadamas.app

Updated: 2026-06-02.

Prioritized. Current product positioning must cover both sides of nadamas: coaches publish horarios, manage their calendar, take student notes and measure progress; athletes find coaches, reserve classes and review their own progress.

## Implemented in this pass

- Landing/root metadata now describes the coach platform: horarios publicados, calendario, notas and student progress.
- Public coaches page metadata now mentions published schedules and progress follow-up.
- App now has a coach calendar view at `/coach/agenda` instead of only a list of upcoming bookings.
- Coaches can record student level, objective, next focus, notes and a 1–5 progress score from `/coach/students`.
- Athletes can see coach progress notes and summary metrics at `/athlete/progress`.

## NEW PRODUCT SEO PRIORITIES

### P1 — Make the coach product explicit above the fold
The landing still visually behaves mostly like a marketplace. Add visible Spanish copy for:
- "Publica tus horarios"
- "Administra tu calendario de clases"
- "Toma notas por alumno"
- "Mide el progreso con objetivos y seguimiento"

Suggested H1 direction: `Calendario y seguimiento para coaches de natación`.
Suggested supporting copy: `Publica horarios, recibe reservas y lleva el progreso de cada alumno desde una sola plataforma.`

### P2 — Add a coach-focused landing section
Create a section targeting commercial-intent searches:
- `Software para coaches de natación`
- `Calendario para entrenadores de natación`
- `Seguimiento de progreso de alumnos`
- `Notas de clases de natación`

Use concrete UI screenshots from agenda/students/progress once stable.

### P3 — Extend FAQ + FAQPage schema
Add questions that match the new product:
- `¿Puedo publicar mis horarios como coach?`
- `¿La plataforma tiene calendario para clases?`
- `¿Puedo tomar notas de mis alumnos?`
- `¿Cómo mide nadamas el progreso del alumno?`

Sync answers byte-for-byte with JSON-LD in `app/(marketing)/page.tsx`.

### P4 — Add Product/SoftwareApplication schema when product copy is public
Current WebSite/Organization/WebPage/FAQPage is valid. Once the coach SaaS value prop is visible on-page, add a conservative `SoftwareApplication` node without fake ratings:
- applicationCategory: `SportsApplication`
- operatingSystem: `Web`
- audience: `Swim coaches and athletes`
- featureList: horarios, calendario, reservas, notas, progreso

### P5 — Internal linking
Add marketing links to `/coaches`, `/contacto`, `/como-verificamos`, `/privacidad`, `/terminos`, and keep app routes noindexed. If a coach waitlist page is added, link CTA traffic there instead of forcing `/login`.

## CRITICAL (fix immediately)

### C1 — Remove Firebase from the marketing bundle (LCP)
~367 KB gzip Firebase Auth/Firestore ships to the public `/` because `app/providers.tsx` (UserProvider → `@/firebase/index`) wraps the `(marketing)` group via root `app/layout.tsx`.
Fix: move `Providers` out of root layout; wrap only `app/(app)/layout.tsx` (it already has `AuthGate`). Root `app/layout.tsx` renders `<html><body>{children}</body></html>`; `(marketing)/layout.tsx` needs no providers. Verify `/dashboard/*` still has UserProvider/ThemeProvider. Re-measure first-load JS for `/`.
Est. impact: LCP −0.5 to −1.2 s on mobile; ~65% first-load JS removed from marketing.

### C2 — Decide WCAG vs mandated palette (primary CTA contrast)
White on Aqua `#00B4D8` = 2.46:1 (fail, need ≥4.5). Aqua text on Ice White = 2.36:1 (fail).
Brand brief mandated exact `#00B4D8` for CTAs — this is a brand decision, NOT auto-fixable. Options:
- (a) Darken CTA background to ~`#0077A8`/`#0E7490` (white text ≥4.5:1) — keeps it a "blue" CTA.
- (b) Navy `#0A2540` text on Aqua background (~6:1) — keeps bright aqua.
- (c) Reserve bright `#00B4D8` for non-text accents only; use darkened aqua for any aqua *text*.
Recommend (a)+(c). Needs user sign-off (deviates from the exact-hex brief).

## HIGH (within 1 week)

### H1 — `noindex` protected routes
Add `export const metadata = { robots: { index: false, follow: false } }` (or a shared segment layout) to `app/(app)/dashboard`, `app/login`, `app/logout`. Then REMOVE those `Disallow` lines from `app/robots.ts` (so the `noindex` can actually be crawled/honored) — keep robots.txt minimal (`Allow: /`, sitemap). Pick noindex OR robots-block, not both.

### H2 — Security headers
`next.config.mjs` `headers()` for all routes: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, strengthen HSTS `max-age=63072000; includeSubDomains; preload`. Add CSP in report-only first (Next/Vercel/Firebase origins).

### H3 — FAQPage + WebPage JSON-LD
Replace the `@graph` in `app/(marketing)/page.tsx` with the block below (keeps existing valid WebSite+Organization, adds `["WebPage","FAQPage"]` from REAL on-page FAQ; keep text byte-synced with `faq.tsx`):

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": "https://nadamas.app/#website", "name": "nadamas.app", "url": "https://nadamas.app", "description": "Marketplace premium para encontrar y reservar coaches de natación.", "inLanguage": "es", "publisher": { "@id": "https://nadamas.app/#org" } },
    { "@type": "Organization", "@id": "https://nadamas.app/#org", "name": "nadamas.app", "url": "https://nadamas.app", "description": "Marketplace para encontrar y reservar coaches de natación verificados: clases privadas o de grupo, en piscina o aguas abiertas.", "logo": { "@type": "ImageObject", "url": "https://nadamas.app/icons/icon_x512.png", "width": 512, "height": 512 } },
    { "@type": ["WebPage","FAQPage"], "@id": "https://nadamas.app/#webpage", "url": "https://nadamas.app/", "name": "nadamas.app · Encuentra y reserva tu coach de natación", "description": "Descubre coaches de natación verificados, reserva en minutos y mejora tu técnica.", "inLanguage": "es", "isPartOf": { "@id": "https://nadamas.app/#website" }, "about": { "@id": "https://nadamas.app/#org" }, "mainEntity": [ /* Question/Answer pairs mirroring faq.tsx EXACTLY */ ] }
  ]
}
```
(Full Q&A draft in the schema specialist output; must match the live accordion answers verbatim, including a real answer for "¿Las clases son privadas?".)

### H4 — Fix broken FAQ answer
`components/marketing/faq.tsx`: "¿Las clases son privadas?" reported with no answer / not expanding. Add a real answer (and differentiate from "¿Qué tipos de clase hay?"). Then sync H3 schema.

### H5 — Trust/legal footer (pre-launch stubs)
Add `Privacidad`, `Términos`, `Contacto`, and a "Cómo verificamos a los coaches" link/page. Even minimal stub pages materially raise E-E-A-T for a payments marketplace. (These replace the dead `#` links removed earlier — now with real targets.)

## MEDIUM (within 1 month)

- M1 — Image `alt`: descriptive Spanish alt on the ~12 empty-alt product/UI images.
- M2 — `images.formats: ['image/avif','image/webp']` in `next.config.mjs`.
- M3 — Long-cache `/public` static assets (headers rule; `logo-nadamas.webp` etc. currently `max-age=0`).
- M4 — `.reveal` no-JS/reduced-motion default `opacity:1` (animate as enhancement); fix the section stuck at 0.22.
- M5 — Browse-intent CTAs → waitlist/public directory instead of `/login` wall (pre-launch conversion).
- M6 — `sitemap.xml` add `<lastmod>`.
- M7 — Keyword coverage: add H2/FAQ using "clases de natación" + "entrenador" synonyms; add 3–4 high-intent FAQ questions (precio, ciudades, "¿necesito saber nadar?", piscina vs aguas abiertas).
- M8 — Env-gated host-level `X-Robots-Tag: noindex` on `pre.*` so staging never indexes.
- M9 — Lower Unsplash source widths in `marketplace-preview.tsx`; audit non-Firebase vendor chunks in marketing first-load.
- M10 — Label fictional sample coach cards "ejemplo de perfil" unmistakably (no Review/AggregateRating schema).

## LOW (backlog)

- Tap targets ≥44px on desktop nav/footer; hero CTA text ≥16px.
- Trailing-slash normalization (canonical/og:url → `https://nadamas.app/`).
- Explicit `<meta robots index,follow,max-image-preview:large>` on `/`.
- Vary near-duplicate phrasings ("con quien de verdad sabe/mejora tu técnica").

## Notes

- All deploys are git-triggered (push `pre` → `pre.nadamas.app`); never `vercel deploy`.
- C2 (palette/WCAG) and H5 (legal pages) need product/brand decisions before implementation.
- C1 is the single highest ROI (perf + it also finishes the earlier LCP fix properly).
