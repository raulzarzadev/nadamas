# DESIGN.md — nadamas.app

Source of truth = brief's EXACT palette. OKLCH given for craft (gradients,
state shifts). No `#000`/`#fff`; brief neutrals already brand-tinted — keep.

## Color tokens

| Role            | Hex       | OKLCH (approx)            | Use |
|-----------------|-----------|---------------------------|-----|
| Deep Ocean      | `#0A2540` | `oklch(0.23 0.05 250)`    | navbar, headings, primary btn, brand |
| Ocean Mid       | `#0077B6` | `oklch(0.52 0.12 245)`    | gradient stop only |
| Aqua            | `#00B4D8` | `oklch(0.72 0.13 220)`    | CTAs, hover, interactive |
| Light Aqua      | `#90E0EF` | `oklch(0.87 0.07 215)`    | soft fills, badges, glow |
| Ice White (bg)  | `#F8FAFC` | `oklch(0.98 0.005 240)`   | page bg, negative space |
| Surface         | `#EAF7FB` | `oklch(0.96 0.015 220)`   | premium cards, stat blocks |
| Text Secondary  | `#4B5563` | `oklch(0.45 0.02 255)`    | body, labels |
| Border          | `#D6EAF0` | `oklch(0.92 0.02 215)`    | hairline separators |

**Brand gradient** (identity element, used as backdrop/glow/mockup-frame, NOT
as text — `background-clip:text` is banned):
`linear-gradient(135deg, #0A2540 0%, #0077B6 45%, #00B4D8 100%)`

**Color strategy:** Committed. Ice White surface dominant; Deep Ocean carries
structure/type; Aqua is the single interactive accent; brand gradient appears
deliberately in hero backdrop, CTA glow, mockup frames, section seams. Not
everywhere.

## Theme

Light. Scene: a swimmer on their phone in daylight after practice, or a coach
planning their week at a sunlit kitchen table. Calm, clean, water-bright.
Light forces itself. No dark mode for the landing.

## Typography

- Display/headings: a rounded-grotesk to echo the lowercase rounded wordmark
  (e.g. variable sans like "Bricolage Grotesque" / "Geist" / system fallback).
  Lowercase-friendly, tight tracking on large sizes.
- Body: high-legibility neutral sans, 65–75ch cap.
- Hierarchy by scale + weight, ≥1.25 step ratio. Editorial, large hero type.

## Motif (from isotype)

Layered wave ribbons + forward diagonal motion. Use as: hero backdrop strokes,
section seams (curved, not hard rules), CTA underglow, scroll-driven flow.
Rounded geometry throughout (generous radii). Soft, low, wide shadows — never
hard.

## Deviations from brief (intentional, impeccable craft laws)

1. **Glassmorphism**: brief says "muy sutil" everywhere. Banned as a system.
   Use at most one purposeful glass element; depth comes from soft shadow +
   Surface tint instead.
2. **No gradient text.** Emphasis via weight/size, color in solid Deep Ocean /
   Aqua. Gradient stays in backgrounds/glow.
3. **No hero-metric template, no identical card grids.** Social proof =
   inline editorial line + faces, not big-number block. Marketplace =
   varied-size Airbnb-style cards. Features = varied rhythm, not 6 identical
   icon+title+text tiles.
4. **No em dashes** in any UI copy.

## Motion

CSS / Web Animations only (no framer-motion). Ease-out-expo / quint. No bounce,
no elastic. Never animate layout props. Scroll-driven reveal (water-flow feel),
reduced-motion respected.

## Stack

Next 16 App Router, TS, Tailwind + daisyUI (existing), zero new deps. Marketing
under route group `(marketing)` with its own minimal layout (no app chrome).
