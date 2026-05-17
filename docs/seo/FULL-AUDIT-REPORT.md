# Full SEO Audit — nadamas.app landing

Audited host: `https://pre.nadamas.app/` (staging alias of branch `pre`, commit ~`3d1d27c`; copy-pillar update `ae6b8fc` deployed shortly after).
Date: 2026-05-17. Method: 6 specialist passes (technical, content, schema, performance, visual/mobile) against the live deploy.

## Executive Summary

**SEO Health Score: 77 / 100 — Good.** Solid foundations (SSG, clean robots/sitemap, rich metadata, valid JSON-LD, strong CLS/INP, honest pre-launch copy, distinctive non-template design). Held back by: marketing bundle shipping Firebase JS (LCP risk), a WCAG-failing primary CTA color, missing noindex on protected routes, no FAQPage schema, empty image alts.

Business type detected: **pre-launch two-sided marketplace** (swimmers ↔ swim coaches), Spanish-language, single indexable page (`/`); `/dashboard/*`,`/login`,`/logout` intentionally excluded.

### Score breakdown (weighted)

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Technical SEO | 25% | 78 | 19.5 |
| Content Quality | 25% | 80 | 20.0 |
| On-Page SEO | 20% | 85 | 17.0 |
| Schema / Structured Data | 10% | 80 | 8.0 |
| Performance (CWV) | 10% | 65 | 6.5 |
| Images | 5% | 60 | 3.0 |
| AI Search Readiness | 5% | 65 | 3.25 |
| **Total** | | | **≈77** |

### Top 5 critical/high issues

1. **Marketing bundle ships ~367 KB gzip Firebase Auth/Firestore JS** (via global `Providers` wrapping the `(marketing)` group). Dominant mobile-LCP risk (~2.3–2.9 s, borderline FAIL). The earlier fix moved only the *loading gate*; Firebase is still bundled into the public page. Highest-leverage fix.
2. **Primary CTA fails WCAG AA contrast.** White text on Aqua `#00B4D8` = 2.46:1 (needs ≥4.5:1). Aqua-as-text (eyebrow label) = 2.36:1. Affects the page's main conversion element. NOTE: the brief mandated this exact palette — resolving this needs a brand decision (darken aqua for text/CTA, or navy text on aqua).
3. **Protected routes have no `noindex`.** `/dashboard`,`/login`,`/logout` return 200 with no robots meta / X-Robots-Tag; robots.txt `Disallow` blocks crawl but not indexing (and conflicts with noindex). Use `noindex` (and reconsider the robots.txt block for the same URLs).
4. **No `FAQPage` structured data** though a real on-page FAQ exists. High-value, honest addition (ready JSON-LD produced — see ACTION-PLAN). Also one FAQ item ("¿Las clases son privadas?") reported with a missing/broken answer — verify in `components/marketing/faq.tsx`.
5. **Missing security headers.** Only HSTS present (weak: no `includeSubDomains`/`preload`). No `X-Content-Type-Options`, `X-Frame-Options`/CSP, `Referrer-Policy`, `Permissions-Policy`.

### Top 5 quick wins

1. Add descriptive Spanish `alt` to the ~12 product/UI images (empty today).
2. Add `<lastmod>` to `sitemap.xml`.
3. Add `images.formats: ['image/avif','image/webp']` in `next.config.mjs` (20–30% smaller marketplace photos).
4. Long-cache `/public` static assets (`logo-nadamas.webp` etc. currently `max-age=0, must-revalidate`).
5. Add `FAQPage`+`WebPage` JSON-LD (code ready in ACTION-PLAN); keep text in sync with the accordion.

---

## Data integrity note (important)

The `seo-content` pass reported "raw HTML empty, content client-only, 0 JSON-LD" and guessed a `pages/index.js` (Pages Router) file. This **contradicts** the `seo-technical` pass (`x-nextjs-prerender: 1`, full copy in initial HTML, SSG confirmed) and the `seo-schema` pass (JSON-LD server-rendered via App Router RSC). The project is App Router (`app/(marketing)/page.tsx`), statically generated. Conclusion: the content agent hit a fetch/JS artifact; **the landing is server-rendered/SSG**. Its content-quality observations (broken FAQ answer, trust/legal gaps, alt text, CTA routing, keyword coverage) remain valid; its "C1 client-only" critical is **discarded**.

---

## Technical SEO (78/100)

PASS: SSG (`x-nextjs-prerender:1`, `x-vercel-cache:HIT`), HTTP→HTTPS 308, HSTS present, valid robots.txt + sitemap.xml, viewport/charset/`lang="es"`, rich metadata + OG 1200×630 + Twitter card, valid JSON-LD, proper 404.

- **HIGH** — Protected routes crawl-blocked but not `noindex` (see Top-5 #3). Pick one mechanism: `noindex` via segment `metadata.robots`, OR robots.txt block — not both for the same URLs.
- **HIGH** — Security headers missing (see Top-5 #5). Add via `next.config.mjs` `headers()`.
- **MEDIUM** — Canonical/OG/JSON-LD/sitemap all reference production `https://nadamas.app` while served on `pre.` — correct by design for a staging alias, BUT the staging host itself is crawlable (`Allow: /`, no robots meta). Add env-gated host-level `X-Robots-Tag: noindex` on `pre.*` so staging never indexes.
- **MEDIUM** — `sitemap.xml` lacks `<lastmod>` (the only signal Google uses from sitemaps).
- **LOW** — Canonical/og:url lack trailing-slash normalization vs sitemap (`/`); add explicit `<meta robots> index,follow,max-image-preview:large` on `/`.

## Content Quality (80/100)

Strong: very low AI-slop, concrete human Spanish copy, correct heading hierarchy (single H1, logical H2/H3), strong intent-matched title/description, honest pre-launch framing (no fake metrics), well-executed dual-audience structure. The two new value-prop pillars (portable history; practical+theoretical vetting + readable reviews) were partially present at audit time and have since been strengthened in copy (commit `ae6b8fc`).

- **HIGH** — No trust/legal infrastructure: footer has no Privacidad / Términos / Contacto / company entity. For a marketplace handling payments this is a Trust (E-E-A-T) gap. (Note: dead `#` legal links were intentionally removed in code review; real stub pages should be added before public launch.)
- **HIGH** — "¿Las clases son privadas?" FAQ item reported with no answer/broken expand — verify `faq.tsx`.
- **MEDIUM** — Keyword coverage gaps: body never uses "clases de natación" / "entrenador" (only "coach"); add an H2/FAQ for "clases de natación con entrenador particular".
- **MEDIUM** — Browse-intent CTAs ("Encontrar coach", "Ver todos los coaches") route straight to `/login` (wall before value). Pre-launch: route to waitlist or a public read-only directory.
- **MEDIUM** — Fictional sample coaches with precise ratings/counts risk reading as fake; label "ejemplo de perfil" unmistakably on the cards (do not emit Review/AggregateRating schema).
- **LOW** — Near-duplicate phrasings ("con quien de verdad sabe/mejora tu técnica"); FAQ could add 3–4 high-intent questions for citability.

## On-Page SEO (85/100)

Strong title (`nadamas.app · Encuentra y reserva tu coach de natación`), keyword-rich 155-char meta description, single H1 visible above the fold at all breakpoints, logical H2/H3, no skipped levels. One-page site so internal-linking is in-page anchors (correct). Minor: vary duplicate phrasings; ensure section headings are real `<h2>` not styled divs.

## Schema / Structured Data (80/100)

Valid `@graph` (WebSite + Organization with verified 512×512 logo `ImageObject`; `@id` linking correct; logo URL returns 200). No errors, honest (no fake ratings, SearchAction correctly absent).
- **HIGH opportunity** — Add combined `["WebPage","FAQPage"]` node from the real on-page FAQ + `Organization.description`. Ready-to-paste JSON-LD in ACTION-PLAN. Not eligible for Google FAQ rich snippets (restricted to gov/health) but valid for other engines/LLMs and entity cohesion.
- Excluded correctly until launch: Offer/Service/Product, AggregateRating/Review, LocalBusiness, SearchAction.

## Performance / CWV (65/100)

- **CLS ~0.00–0.02 PASS** (next/image with dimensions, no web fonts, transform/opacity-only scroll reveal with `@supports` fallback, reduced-motion honored).
- **INP ~50–120 ms PASS** (only `site-nav` is client; FAQ native `<details>`; passive scroll listener).
- **LCP ~2.3–2.9 s BORDERLINE/FAIL (mobile P75).** LCP element = hero `<h1>` (system font). Root cause: ~567 KB first-load JS, of which a single ~367 KB gzip chunk is Firebase Auth/Firestore/App-Check pulled into the marketing page via the global `Providers` (`app/providers.tsx` → `UserProvider` → `@/firebase/index`). The public page needs no auth.
- **CRITICAL** — Keep Firebase out of the `(marketing)` group: scope `Providers` to `(app)` only (or dynamic-import with `ssr:false` route-gated). Est. −0.5–1.2 s LCP.
- **HIGH** — Long-cache `/public` assets; enable AVIF.
- **MEDIUM** — Lower Unsplash source widths in `marketplace-preview.tsx`; audit non-Firebase vendor chunks leaking into marketing.
- PSI/CrUX field data unavailable (API 429); CWV are source+network estimates.

## Images (60/100)

next/image used well (dimensions/sizes/priority on logo, optimized webp). Main gap: ~12 product/UI images have empty `alt` (accessibility + image-context loss). Add descriptive Spanish alts. Enable AVIF. Confirm avatar/mockup images have intrinsic dimensions to avoid slow-network CLS.

## Visual / Mobile / UX

Strong intentional design (not AI-template). Above-the-fold passes on 375px mobile and desktop (value prop + both CTAs + social proof visible). Zero horizontal overflow at 1920/1366/768/375. Mobile menu accessibility is textbook (`aria-controls`/`aria-expanded`, `inert`+`aria-hidden` when closed, 48px targets). Screenshots: `screenshots/{desktop,laptop,tablet,mobile}_{atf,full}.png`, `mobile_menu_open.png`.

- **HIGH** — WCAG AA contrast fails: white on aqua CTA 2.46:1; aqua text on Ice White 2.36:1 (see Top-5 #2 — needs brand decision).
- **MEDIUM** — `.reveal` sections can stay at `opacity:0` for non-JS/bot/social-preview renderers; one section observed stuck at 0.22. Add a no-JS/reduced-motion default of `opacity:1` (animate as enhancement only) and investigate the stuck section.
- **MEDIUM** — Desktop nav/footer tap targets ~18px (<44px); hero buttons 42px. Increase hit area via padding.
- **LOW** — Hero CTA text 14.7px (small for primary action); favicon query string cosmetically odd (harmless).

Positives to preserve: 16px body, body contrast 7.24:1, navy headings 14.85:1, white-on-navy 15.54:1 (all pass AA), clean responsive reflow, honest humble pre-launch tone.
