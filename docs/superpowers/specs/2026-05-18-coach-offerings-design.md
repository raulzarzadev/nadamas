# Coach Offerings — "Lugares, horarios y precios"

Date: 2026-05-18
Status: Approved (design)

## Problem

Coach profile keeps location and price as two unrelated lists
(`teachingLocations`, `priceOptions`). A coach cannot express "I teach
at-home private classes for $400/hr from 6–9pm" vs "group class every
Saturday 9am at El Coromuel for $250" as coherent units. Booking does not
carry price, so athletes confirm without seeing cost or modality.

Target users are non-technical freelancers. The form must be easy to
understand and fill.

## Goal

One section that lists the classes a coach offers. Each offering bundles
**where + when + price** into a single, sentence-like unit. Two modes:
fixed venue (pool) and at-home (coverage zone). Adding/editing goes
through a short 3-step stepper; the resting state is a compact summary
list that stays simple when complexity is not needed.

## Data model

New type in `firebase/coaches/coach.model.ts`, replaces
`CoachTeachingLocation` + `CoachPriceOption`:

```ts
export type CoachOfferingMode = 'fixed' | 'home'
export type CoachOfferingGroup = 'particular' | 'grupal'
export type CoachOfferingUnit = 'clase' | 'sesión' | 'mes' | 'paquete'

export interface CoachClassOffering {
  id: string
  mode: CoachOfferingMode
  // fixed:
  placeName?: string
  locationUrl?: string
  imageUrl?: string
  // home:
  coverageArea?: string        // free text: "Centro y Fovissste, La Paz"
  // class:
  groupType: CoachOfferingGroup
  maxPeople?: number | null    // only when groupType === 'grupal'
  days: string[]               // 'Lun'..'Dom' (existing DAYS labels)
  startTime: string            // 'HH:MM'
  endTime: string
  durationMinutes: number | null // default 60
  // price:
  price: number | null
  currency: 'MXN'
  unit: CoachOfferingUnit
  details?: string
}
```

`CoachPublic` change:
- Add `classOfferings?: CoachClassOffering[]`.
- Keep `teachingLocations?` / `priceOptions?` in the interface as optional
  legacy fields (read-only, for migration). No new writes to them.

### Migration (best-effort, client-side)

When the profile loads and `classOfferings` is absent but legacy data
exists, derive offerings:
- One offering per `teachingLocations[].availability` slot:
  `mode:'fixed'`, `placeName=name`, `locationUrl`, `imageUrl`, `days`,
  `startTime`, `endTime`, `groupType:'particular'`,
  `durationMinutes:60`, `price:null`, `unit:'clase'`. The offering `id`
  is derived deterministically from the legacy location id + slot index
  (`<locationId>:<slotIndex>`) so existing booking links keep resolving.
- `priceOptions` cannot be reliably tied to a location → not auto-linked.
  If exactly one location and one price option exist, apply that price to
  all derived offerings; otherwise leave price `null` (coach fills it).
- Derived offerings are shown immediately but only persisted on the next
  save (autosave or explicit). Legacy fields are not deleted.

## UI

Single profile section titled **"Lugares, horarios y precios"**,
replacing both `LocationsCard` and `PricingCard`. New component
`components/coach/OfferingsCard.tsx`. `PricingCard.tsx` and
`LocationsCard.tsx` are removed once the profile page no longer
references them.

### Resting state

Vertical list of summary cards. Each card reads like a sentence:

```
📍 Grupal (máx 8) · El Coromuel                                    ✎
Sáb 9:00–11:00 am · 60 min
$250 por clase
```

`🏠` for home mode (shows coverage area instead of place name).
Empty state: short prompt + "Agregar clase". Below the list:
`+ Agregar clase` button.

### Stepper (add / edit)

Opens inline (expand in place) replacing the card list area, not a
route. Three steps; "Atrás / Siguiente"; step 3 has a live preview of
the summary card and "Guardar".

- **Paso 1 — ¿Dónde?**: segmented toggle `📍 Lugar fijo` /
  `🏠 A domicilio`.
  - fixed: `placeName` (required). Collapsible "Más opciones": Google
    Maps link, location photo (reuses `ImageInput` + `CoachCRUD.uploadAsset`,
    still added to gallery labeled "Lugares de trabajo").
  - home: single field `coverageArea` ("Zona / colonias que cubro",
    required).
- **Paso 2 — ¿Qué y cuándo?**: segmented `Particular` / `👥 Grupal`.
  When grupal → optional `maxPeople`. Day pills (existing component
  pattern). `startTime` / `endTime` (`type=time`). `durationMinutes`
  (default 60).
- **Paso 3 — ¿Cuánto?**: `price` + `unit` select
  (clase/sesión/mes/paquete). Collapsible details. Live preview card.

Validation to allow Save: mode-required field present (placeName or
coverageArea), groupType set, ≥1 day, startTime, endTime. Price may be
empty (shows "$ —") but is encouraged.

### Save behavior

Reuse existing autosave + `SaveButton` pattern (5s debounce + force
`saveNow`), same as other profile sections. Section persists
`{ classOfferings }` via the profile page's `onSave`.

## Booking flow changes

`lib/coach-booking.ts`:
- `CoachBookingSelection` gains: `offeringId`, `mode`, `groupType`,
  `price`, `currency`, `unit`, `durationMinutes`, `coverageArea?`.
  `locationId` is replaced by `offeringId`; `locationName` becomes the
  display label (place name or coverage area).
- `flattenCoachBookingSelections` reads `coach.classOfferings` (falls
  back to deriving from legacy locations when offerings absent, same
  rule as migration, price `null`).
- `bookingSelectionKey` / `parseBookingSelection` / serialize updated for
  the new fields. Parsing stays backward-tolerant: old links carrying
  `locationId` resolve because derived offering ids embed the legacy
  location id (see Migration).

`app/api/bookings/route.ts` (POST): persist the selected offering's
price/modality snapshot on the `Booking` (so cancellations/notifications
and "mis reservas" show what was agreed). `Booking` interface extended
with the same snapshot fields.

`app/(app)/athlete/coach/[id]/page.tsx`: selection list shows price,
modality (fijo/domicilio), group/particular, duration before confirm.

`CoachPublicProfile.tsx`: replace separate "Horarios y lugares" + 
"Precios" sections with one "Clases" list rendering offerings as the
same summary cards (read-only).

`marketplace-preview.tsx`: if it surfaces location/price, point it at
offerings (cheapest offering or count). Verify on implementation.

## Completeness

`lib/coach-completeness.ts`: `hasLocation` becomes
`hasOffering = !!pub.classOfferings?.length` (or legacy fallback).
Label stays "Lugar y horarios" (covers offerings).

## Out of scope (YAGNI)

- Per-colonia structured zones / map radius (free text only).
- Group capacity enforcement / waitlist (cupo is informational only).
- Cancellation policy (tracked separately, unchanged here).
- Recurring-date calendar / specific dates (still day-of-week + range).
- Deleting legacy `teachingLocations` / `priceOptions` data.

## Affected files

- `firebase/coaches/coach.model.ts` — new types, `classOfferings`.
- `components/coach/OfferingsCard.tsx` — new (stepper + summary list).
- `components/coach/LocationsCard.tsx`, `PricingCard.tsx` — removed.
- `app/(app)/coach/coach-profile/page.tsx` — swap two cards for one.
- `components/coach/CoachPublicProfile.tsx` — render offerings.
- `lib/coach-booking.ts` — selection model + flatten/parse.
- `app/api/bookings/route.ts` + `Booking` type — price snapshot.
- `app/(app)/athlete/coach/[id]/page.tsx` — show price/modality.
- `lib/coach-completeness.ts` — offering check.
- `components/marketing/marketplace-preview.tsx` — verify/adjust.
