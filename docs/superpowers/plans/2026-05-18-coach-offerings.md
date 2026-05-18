# Coach Offerings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the coach profile's separate locations + prices lists with a single "Lugares, horarios y precios" section where each entry is a class offering (where + when + price), and surface price/modality through booking.

**Architecture:** New `CoachClassOffering` type on the public coach doc (`classOfferings`), legacy `teachingLocations`/`priceOptions` kept read-only for migration. New `OfferingsCard` (summary list + inline 3-step stepper) replaces `LocationsCard` + `PricingCard`. A pure helper module `lib/coach-offerings.ts` holds migration + formatting. `lib/coach-booking.ts` carries the offering snapshot through the booking flow; the bookings API persists that snapshot.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Firebase Admin/CRUD, Tailwind v4 + daisyUI, Biome. No unit-test runner — verification is `pnpm typecheck` + `pnpm check` + targeted Playwright e2e (`pnpm test:e2e`).

**Verification convention:** Every task ends by running `pnpm typecheck` (must pass with no errors) and `pnpm check` (Biome — must report no errors; formatting auto-applied with `pnpm format` if needed), then a commit. Do NOT run `git push` — the user pushes manually.

---

## File Structure

- `firebase/coaches/coach.model.ts` — add offering types + `classOfferings`; keep legacy fields.
- `lib/coach-offerings.ts` — NEW. Pure helpers: deterministic id, derive-from-legacy migration, summary formatters, DAYS constant.
- `lib/coach-booking.ts` — selection model gains offering snapshot; flatten reads offerings (legacy fallback); parse stays tolerant.
- `app/api/bookings/route.ts` — validate offeringId, snapshot price/modality on booking, id from offeringId.
- `components/coach/OfferingsCard.tsx` — NEW. Summary list + inline stepper + autosave.
- `app/(app)/coach/coach-profile/page.tsx` — swap `LocationsCard`+`PricingCard` for `OfferingsCard`.
- `components/coach/CoachPublicProfile.tsx` — render offerings instead of two sections.
- `app/(app)/athlete/coach/[id]/page.tsx` — show price/modality/duration from selection.
- `lib/coach-completeness.ts` — offering completeness check.
- `components/marketing/marketplace-preview.tsx` — summaries + slot list from offerings.
- `components/coach/LocationsCard.tsx`, `components/coach/PricingCard.tsx` — DELETED (last task).
- `e2e/coach-offerings.spec.ts` — NEW. Public marketplace renders an offering summary.

---

## Task 1: Offering types on the model

**Files:**
- Modify: `firebase/coaches/coach.model.ts`

- [ ] **Step 1: Add offering types and `classOfferings` field**

In `firebase/coaches/coach.model.ts`, immediately above the existing `export interface CoachPriceOption {` block, add:

```ts
export type CoachOfferingMode = 'fixed' | 'home'
export type CoachOfferingGroup = 'particular' | 'grupal'
export type CoachOfferingUnit = 'clase' | 'sesión' | 'mes' | 'paquete'

export interface CoachClassOffering {
  id: string
  mode: CoachOfferingMode
  /** fixed mode */
  placeName?: string
  locationUrl?: string
  imageUrl?: string
  /** home mode — free text coverage zone */
  coverageArea?: string
  groupType: CoachOfferingGroup
  /** only meaningful when groupType === 'grupal' */
  maxPeople?: number | null
  days: string[]
  startTime: string
  endTime: string
  durationMinutes: number | null
  price: number | null
  currency: 'MXN'
  unit: CoachOfferingUnit
  details?: string
}
```

Then, inside `export interface CoachPublic {`, directly under the line `priceOptions?: CoachPriceOption[]`, add:

```ts
  /** New unified model. Replaces teachingLocations + priceOptions. */
  classOfferings?: CoachClassOffering[]
```

Leave `teachingLocations` and `priceOptions` as-is (legacy, read-only for migration).

- [ ] **Step 2: Verify and commit**

Run: `pnpm typecheck`
Expected: PASS (no output / exit 0).

Run: `pnpm check`
Expected: no errors.

```bash
git add firebase/coaches/coach.model.ts
git commit -m "feat(coach): add CoachClassOffering model

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Pure offerings helpers (`lib/coach-offerings.ts`)

**Files:**
- Create: `lib/coach-offerings.ts`

- [ ] **Step 1: Create the helper module**

Create `lib/coach-offerings.ts` with this exact content:

```ts
import type {
  CoachClassOffering,
  CoachPublic,
} from '@/firebase/coaches/coach.model'

export const OFFERING_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const OFFERING_UNITS: { value: CoachClassOffering['unit']; label: string }[] = [
  { value: 'clase', label: 'por clase' },
  { value: 'sesión', label: 'por sesión' },
  { value: 'mes', label: 'por mes' },
  { value: 'paquete', label: 'por paquete' },
]

export function createOffering(): CoachClassOffering {
  return {
    id: crypto.randomUUID(),
    mode: 'fixed',
    placeName: '',
    locationUrl: '',
    coverageArea: '',
    groupType: 'particular',
    maxPeople: null,
    days: [],
    startTime: '',
    endTime: '',
    durationMinutes: 60,
    price: null,
    currency: 'MXN',
    unit: 'clase',
    details: '',
  }
}

/**
 * Derive offerings from legacy teachingLocations when classOfferings is
 * absent. Offering id embeds the legacy location id + slot index so old
 * booking links keep resolving.
 */
export function deriveOfferingsFromLegacy(
  coach: Pick<CoachPublic, 'teachingLocations' | 'priceOptions'>
): CoachClassOffering[] {
  const locations = coach.teachingLocations || []
  const prices = coach.priceOptions || []
  const onlyPrice =
    locations.length <= 1 && prices.length === 1 && prices[0].amount !== null
      ? prices[0]
      : null

  return locations.flatMap((location) =>
    location.availability.map((slot, slotIndex) => ({
      id: `${location.id}:${slotIndex}`,
      mode: 'fixed' as const,
      placeName: location.name || '',
      locationUrl: location.locationUrl || '',
      imageUrl: location.imageUrl,
      coverageArea: '',
      groupType: 'particular' as const,
      maxPeople: null,
      days: slot.days,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: onlyPrice?.durationMinutes ?? 60,
      price: onlyPrice?.amount ?? null,
      currency: 'MXN' as const,
      unit: onlyPrice?.unit ?? ('clase' as const),
      details: onlyPrice?.details || '',
    }))
  )
}

/** classOfferings if present, else legacy-derived. */
export function resolveOfferings(
  coach: Pick<CoachPublic, 'classOfferings' | 'teachingLocations' | 'priceOptions'>
): CoachClassOffering[] {
  if (coach.classOfferings?.length) return coach.classOfferings
  return deriveOfferingsFromLegacy(coach)
}

export function offeringPlaceLabel(offering: CoachClassOffering): string {
  if (offering.mode === 'home') {
    return offering.coverageArea?.trim() || 'A domicilio'
  }
  return offering.placeName?.trim() || 'Lugar por definir'
}

export function offeringHeadline(offering: CoachClassOffering): string {
  const icon = offering.mode === 'home' ? '🏠' : '📍'
  const group =
    offering.groupType === 'grupal'
      ? offering.maxPeople
        ? `Grupal (máx ${offering.maxPeople})`
        : 'Grupal'
      : 'Particular'
  return `${icon} ${group} · ${offeringPlaceLabel(offering)}`
}

export function offeringWhen(offering: CoachClassOffering): string {
  const days = offering.days.join(', ') || 'Días por definir'
  const time =
    offering.startTime && offering.endTime
      ? ` · ${offering.startTime}–${offering.endTime}`
      : ''
  const duration = offering.durationMinutes ? ` · ${offering.durationMinutes} min` : ''
  return `${days}${time}${duration}`
}

export function offeringPrice(offering: CoachClassOffering): string {
  const unit = OFFERING_UNITS.find((u) => u.value === offering.unit)?.label || 'por clase'
  return offering.price !== null ? `$${offering.price} ${unit}` : `$ — ${unit}`
}

/** Cheapest priced offering label for cards, or a fallback. */
export function offeringsPriceSummary(offerings: CoachClassOffering[]): string {
  const priced = offerings
    .filter((o) => o.price !== null)
    .sort((a, b) => (a.price as number) - (b.price as number))
  if (!priced.length) return 'Precio por definir'
  return offeringPrice(priced[0])
}

export function offeringsAvailabilitySummary(offerings: CoachClassOffering[]): string {
  if (!offerings.length) return 'Horarios por publicar'
  return `${offerings.length} ${offerings.length === 1 ? 'clase' : 'clases'}`
}
```

- [ ] **Step 2: Verify and commit**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm check`
Expected: no errors (run `pnpm format` first if Biome flags formatting, then re-run `pnpm check`).

```bash
git add lib/coach-offerings.ts
git commit -m "feat(coach): offerings migration + format helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Carry offering snapshot through booking selection

**Files:**
- Modify: `lib/coach-booking.ts`

- [ ] **Step 1: Replace the selection model and flatten/parse logic**

Replace the ENTIRE contents of `lib/coach-booking.ts` with:

```ts
import type { CoachClassOffering, CoachPublic } from '@/firebase/coaches/coach.model'
import {
  offeringPlaceLabel,
  resolveOfferings,
} from '@/lib/coach-offerings'

export type CoachBookingSelection = {
  coachId: string
  offeringId: string
  /** display label: place name or coverage area */
  locationName: string
  mode: CoachClassOffering['mode']
  groupType: CoachClassOffering['groupType']
  days: string[]
  startTime: string
  endTime: string
  durationMinutes: number | null
  price: number | null
  currency: 'MXN'
  unit: CoachClassOffering['unit']
}

export interface Booking extends CoachBookingSelection {
  id: string
  athleteId: string
  athleteName: string
  athletePhone?: string
  athleteEmail: string | null
  coachName: string | null
  status: string
  source: string
  createdAt: number
  updatedAt: number
}

export function formatSlotLabel(
  selection: Pick<CoachBookingSelection, 'days' | 'startTime' | 'endTime'>
) {
  const days = selection.days.join(', ')
  return `${days} · ${selection.startTime}–${selection.endTime}`
}

export function toBookingSelection(
  coachId: string,
  offering: CoachClassOffering
): CoachBookingSelection {
  return {
    coachId,
    offeringId: offering.id,
    locationName: offeringPlaceLabel(offering),
    mode: offering.mode,
    groupType: offering.groupType,
    days: offering.days,
    startTime: offering.startTime,
    endTime: offering.endTime,
    durationMinutes: offering.durationMinutes,
    price: offering.price,
    currency: offering.currency,
    unit: offering.unit,
  }
}

export function flattenCoachBookingSelections(
  coach: CoachPublic & { id: string }
): CoachBookingSelection[] {
  return resolveOfferings(coach).map((offering) =>
    toBookingSelection(coach.id as string, offering)
  )
}

export function bookingSelectionKey(
  selection: Pick<CoachBookingSelection, 'coachId' | 'offeringId'>
) {
  return [selection.coachId, selection.offeringId].join('::')
}

export function serializeBookingSelection(selection: CoachBookingSelection) {
  return encodeURIComponent(JSON.stringify(selection))
}

export function parseBookingSelection(raw: string | null) {
  if (!raw) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CoachBookingSelection> & {
      // tolerate links produced before the offerings refactor
      locationId?: string
    }
    const offeringId = parsed.offeringId || parsed.locationId
    if (
      !parsed.coachId ||
      !offeringId ||
      !parsed.locationName ||
      !Array.isArray(parsed.days) ||
      parsed.days.length === 0 ||
      !parsed.startTime ||
      !parsed.endTime
    ) {
      return null
    }

    return {
      coachId: parsed.coachId,
      offeringId,
      locationName: parsed.locationName,
      mode: parsed.mode ?? 'fixed',
      groupType: parsed.groupType ?? 'particular',
      days: parsed.days,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      durationMinutes: parsed.durationMinutes ?? null,
      price: parsed.price ?? null,
      currency: 'MXN',
      unit: parsed.unit ?? 'clase',
    } satisfies CoachBookingSelection
  } catch {
    return null
  }
}

export function buildCoachBookingTarget(selection: CoachBookingSelection) {
  return `/athlete/coach/${selection.coachId}?booking=${serializeBookingSelection(selection)}`
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: FAIL — errors in `app/api/bookings/route.ts`, `app/(app)/athlete/coach/[id]/page.tsx`, `components/marketing/marketplace-preview.tsx` referencing removed `locationId` / changed `flattenCoachBookingSelections` signature. This is expected; Tasks 4–9 fix each consumer. Do not commit yet.

- [ ] **Step 3: Commit (with consumers temporarily broken is NOT allowed — commit after Task 4)**

Skip the commit here. Proceed directly to Task 4; commit at the end of Task 4 once the API consumer compiles. (Tasks 3+4 form one commit.)

---

## Task 4: Bookings API uses offering snapshot

**Files:**
- Modify: `app/api/bookings/route.ts`

- [ ] **Step 1: Update validation, id, and persisted booking**

In `app/api/bookings/route.ts`, replace the `bookingIdFor` function with:

```ts
function bookingIdFor(athleteId: string, selection: CoachBookingSelection) {
  return createHash('sha1')
    .update([athleteId, selection.coachId, selection.offeringId].join('|'))
    .digest('hex')
}
```

In `POST`, replace the body type + validation block:

```ts
  const body = (await request.json()) as Partial<CoachBookingSelection> & {
    locationId?: string
    athleteProfile?: { name?: string; phone?: string }
  }

  const offeringId = body.offeringId || body.locationId
  if (
    !body.coachId ||
    !offeringId ||
    !body.locationName ||
    !Array.isArray(body.days) ||
    body.days.length === 0 ||
    !body.startTime ||
    !body.endTime
  ) {
    return NextResponse.json({ error: 'Datos de reserva incompletos.' }, { status: 400 })
  }
```

Then replace the `const booking = { ... }` object with (note the snapshot fields and `offeringId`):

```ts
  const booking = {
    athleteId: caller.uid,
    athleteName:
      profileName ||
      athleteDoc.data()?.displayName ||
      athleteDoc.data()?.name ||
      caller.name ||
      'Alumno',
    athletePhone: profilePhone,
    athleteEmail: athleteDoc.data()?.email || caller.email || null,
    coachId: body.coachId,
    coachName: publicNameFromUser(coachDoc.data()),
    offeringId,
    locationName: body.locationName,
    mode: body.mode ?? 'fixed',
    groupType: body.groupType ?? 'particular',
    days: body.days,
    startTime: body.startTime,
    endTime: body.endTime,
    durationMinutes: body.durationMinutes ?? null,
    price: body.price ?? null,
    currency: 'MXN' as const,
    unit: body.unit ?? 'clase',
    status: 'confirmed',
    source: 'marketplace',
    createdAt: now,
    updatedAt: now,
  }
```

- [ ] **Step 2: Verify API + booking lib compile**

Run: `pnpm typecheck`
Expected: still FAILS, but only in `app/(app)/athlete/coach/[id]/page.tsx` and `components/marketing/marketplace-preview.tsx` (booking lib + API now clean). Confirm no errors are reported under `lib/coach-booking.ts` or `app/api/bookings/route.ts`.

- [ ] **Step 3: Commit Tasks 3+4 together**

```bash
git add lib/coach-booking.ts app/api/bookings/route.ts
git commit -m "feat(booking): carry offering snapshot (price/modality) through booking

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `OfferingsCard` — summary list + empty state

**Files:**
- Create: `components/coach/OfferingsCard.tsx`

- [ ] **Step 1: Create the component with list + add stub (no stepper yet)**

Create `components/coach/OfferingsCard.tsx`:

```tsx
'use client'
import SaveButton from '@comps/SaveButton'
import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import type { CoachClassOffering, CoachGalleryPhoto } from '@/firebase/coaches/coach.model'
import { useAutosave } from '@/hooks/useAutosave'
import {
  createOffering,
  offeringHeadline,
  offeringPrice,
  offeringWhen,
  resolveOfferings,
} from '@/lib/coach-offerings'
import ProfileSection from './ProfileSection'

interface OfferingsValue {
  classOfferings?: CoachClassOffering[]
  teachingLocations?: never
}

export default function OfferingsCard({
  uid,
  value,
  saving,
  onSave,
}: {
  uid: string
  value: {
    classOfferings?: CoachClassOffering[]
    teachingLocations?: import('@/firebase/coaches/coach.model').CoachTeachingLocation[]
    priceOptions?: import('@/firebase/coaches/coach.model').CoachPriceOption[]
    galleryPhotos?: CoachGalleryPhoto[]
  }
  saving: boolean
  onSave: (v: {
    classOfferings: CoachClassOffering[]
    galleryPhotos?: CoachGalleryPhoto[]
  }) => void
}) {
  const initial = useMemo(
    () =>
      resolveOfferings({
        classOfferings: value.classOfferings,
        teachingLocations: value.teachingLocations,
        priceOptions: value.priceOptions,
      }),
    [value.classOfferings, value.teachingLocations, value.priceOptions]
  )
  const [offerings, setOfferings] = useState<CoachClassOffering[]>(initial)
  const [galleryPhotos, setGalleryPhotos] = useState<CoachGalleryPhoto[]>(
    value.galleryPhotos || []
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => setOfferings(initial), [initial])
  useEffect(() => setGalleryPhotos(value.galleryPhotos || []), [value.galleryPhotos])

  const { status: autoStatus, saveNow } = useAutosave(
    JSON.stringify({ offerings, galleryPhotos }),
    () => onSave({ classOfferings: offerings, galleryPhotos }),
    { enabled: !editingId }
  )

  const startAdd = () => {
    const next = createOffering()
    setOfferings((current) => [...current, next])
    setEditingId(next.id)
  }

  return (
    <ProfileSection
      title="Lugares, horarios y precios"
      description="Cada clase que ofreces: dónde la das, qué días y horario, y cuánto cuesta. Puedes tener una en un lugar fijo y otra a domicilio con precio distinto."
      summary={`${offerings.length} ${offerings.length === 1 ? 'clase' : 'clases'}`}
    >
      {offerings.length === 0 && (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-8 text-center text-sm text-[var(--c-text-2)]">
          Aún no agregas clases. Empieza con la primera.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {offerings.map((offering) => (
          <article
            key={offering.id}
            className="flex items-start justify-between gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-[var(--c-ocean)]">
                {offeringHeadline(offering)}
              </p>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">{offeringWhen(offering)}</p>
              <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                {offeringPrice(offering)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label="Editar clase"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingId(offering.id)}
              >
                <FiEdit2 aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Quitar clase"
                className="btn btn-ghost btn-sm text-[var(--c-error,#b91c1c)]"
                onClick={() =>
                  setOfferings((current) => current.filter((o) => o.id !== offering.id))
                }
              >
                <FiTrash2 aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="btn btn-ghost self-start" onClick={startAdd}>
        <FiPlus /> Agregar clase
      </button>

      <div className="flex justify-end border-t border-[var(--c-border)] pt-5">
        <SaveButton
          status={saving ? 'saving' : autoStatus}
          onClick={saveNow}
          disabled={!!editingId}
          idleLabel="Guardado"
          savedLabel="Guardado"
        />
      </div>
    </ProfileSection>
  )
}
```

> Note: `uid` is unused until Task 6 (image upload). Prefix the param as `_uid` is NOT allowed (it is part of the public prop contract used by the page). Instead, add `void uid` as the first line of the component body to satisfy Biome's no-unused-vars until Task 6 wires it. Remove `void uid` in Task 6.

Add `void uid` right after the destructured props, before `const initial`.

- [ ] **Step 2: Verify component compiles in isolation**

Run: `pnpm typecheck`
Expected: still FAILS only in `athlete/coach/[id]/page.tsx` and `marketplace-preview.tsx` (and now possibly `coach-profile/page.tsx` is unchanged so still references old cards — that still compiles). Confirm NO errors under `components/coach/OfferingsCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/coach/OfferingsCard.tsx
git commit -m "feat(coach): OfferingsCard summary list + empty state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `OfferingsCard` — inline 3-step stepper + image upload

**Files:**
- Modify: `components/coach/OfferingsCard.tsx`

- [ ] **Step 1: Add the stepper UI and image upload**

In `components/coach/OfferingsCard.tsx`:

1. Remove the `void uid` line added in Task 5.
2. Update imports — replace the import block at the top with:

```tsx
'use client'
import ImageInput from '@comps/Inputs/ImageInput'
import SaveButton from '@comps/SaveButton'
import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import type { CoachClassOffering, CoachGalleryPhoto } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { useAutosave } from '@/hooks/useAutosave'
import { optimizeImageForUpload } from '@/lib/image-optimizer'
import {
  createOffering,
  OFFERING_DAYS,
  OFFERING_UNITS,
  offeringHeadline,
  offeringPrice,
  offeringWhen,
  resolveOfferings,
} from '@/lib/coach-offerings'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import ProfileSection from './ProfileSection'
```

3. Delete the unused `OfferingsValue` interface (it was a placeholder).
4. Inside the component, after the `editingId` state, add stepper state + helpers:

```tsx
  const [step, setStep] = useState(1)
  const [busyImage, setBusyImage] = useState(false)
  const [imageProgress, setImageProgress] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const editing = offerings.find((o) => o.id === editingId) || null

  const patchEditing = (patch: Partial<CoachClassOffering>) =>
    setOfferings((current) =>
      current.map((o) => (o.id === editingId ? { ...o, ...patch } : o))
    )

  const closeStepper = () => {
    setEditingId(null)
    setStep(1)
    setError(null)
  }

  const cancelStepper = () => {
    // drop a half-added offering with no place/zone and no day
    setOfferings((current) =>
      current.filter(
        (o) =>
          o.id !== editingId ||
          o.placeName?.trim() ||
          o.coverageArea?.trim() ||
          o.days.length > 0
      )
    )
    closeStepper()
  }

  const stepValid = (s: number, o: CoachClassOffering) => {
    if (s === 1) {
      return o.mode === 'home'
        ? !!o.coverageArea?.trim()
        : !!o.placeName?.trim()
    }
    if (s === 2) return o.days.length > 0 && !!o.startTime && !!o.endTime
    return true
  }

  const uploadImage = async (file: File) => {
    if (!editingId) return
    setError(null)
    setBusyImage(true)
    let finished = false
    let toUpload = file
    try {
      toUpload = (await optimizeImageForUpload(file)).file
    } catch (e) {
      reportInternalError('OFFERING_IMAGE_PREPARE', e)
      setError(GENERIC_USER_ERROR)
      setBusyImage(false)
      return
    }
    CoachCRUD.uploadAsset({ file: toUpload, uid, scope: 'public' }, (progress, url) => {
      if (typeof progress === 'number') setImageProgress(progress)
      if (!url || finished) return
      finished = true
      patchEditing({ imageUrl: url })
      setGalleryPhotos((current) => [...current, { url, label: 'Lugares de trabajo' }])
      setImageProgress(undefined)
      setBusyImage(false)
    })
    setTimeout(() => {
      if (finished) return
      finished = true
      setError('No se pudo subir la imagen del lugar.')
      setImageProgress(undefined)
      setBusyImage(false)
    }, 30000)
  }
```

5. Replace the JSX returned from the component. The `ProfileSection` wrapper stays; its children become: error banner, then EITHER the stepper (when `editing`) OR the list+add+save. Replace everything from `return (` to the end of the component with:

```tsx
  if (editing) {
    return (
      <ProfileSection
        title="Lugares, horarios y precios"
        description="Cada clase que ofreces: dónde, cuándo y cuánto cuesta."
        summary={`Editando · paso ${step} de 3`}
      >
        {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

        <div className="flex gap-2 text-xs font-semibold">
          {['Dónde', 'Qué y cuándo', 'Cuánto'].map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${
                step === i + 1
                  ? 'bg-[var(--c-ocean)] text-white'
                  : 'bg-[var(--c-surface)] text-[var(--c-text-2)]'
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {(['fixed', 'home'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    editing.mode === m
                      ? 'bg-[var(--c-ocean)] text-white'
                      : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                  }`}
                  onClick={() => patchEditing({ mode: m })}
                >
                  {m === 'fixed' ? '📍 Lugar fijo' : '🏠 A domicilio'}
                </button>
              ))}
            </div>

            {editing.mode === 'fixed' ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-[var(--c-ocean)]">
                    Nombre del lugar
                  </span>
                  <input
                    className="input input-bordered bg-white"
                    placeholder="Ej. Alberca El Coromuel"
                    value={editing.placeName || ''}
                    onChange={(e) => patchEditing({ placeName: e.target.value })}
                  />
                </label>
                <details className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--c-text-2)]">
                    Más opciones (opcional)
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <input
                      className="input input-bordered bg-white"
                      placeholder="Link de Google Maps"
                      value={editing.locationUrl || ''}
                      onChange={(e) => patchEditing({ locationUrl: e.target.value })}
                    />
                    <ImageInput
                      label="Foto del lugar"
                      imageUrl={editing.imageUrl}
                      imageAlt={editing.placeName || 'Lugar de clases'}
                      busy={busyImage}
                      progress={imageProgress}
                      helperText="También se agrega a tu galería como “Lugares de trabajo”."
                      onFileSelected={(file) => uploadImage(file)}
                    />
                  </div>
                </details>
              </>
            ) : (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[var(--c-ocean)]">
                  Zona / colonias que cubro
                </span>
                <input
                  className="input input-bordered bg-white"
                  placeholder="Ej. Centro y Fovissste, La Paz"
                  value={editing.coverageArea || ''}
                  onChange={(e) => patchEditing({ coverageArea: e.target.value })}
                />
              </label>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {(['particular', 'grupal'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    editing.groupType === g
                      ? 'bg-[var(--c-ocean)] text-white'
                      : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                  }`}
                  onClick={() => patchEditing({ groupType: g })}
                >
                  {g === 'particular' ? 'Particular' : '👥 Grupal'}
                </button>
              ))}
            </div>

            {editing.groupType === 'grupal' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-[var(--c-ocean)]">
                  Cupo máximo (opcional)
                </span>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  className="input input-bordered w-32 bg-white"
                  placeholder="8"
                  value={editing.maxPeople ?? ''}
                  onChange={(e) =>
                    patchEditing({
                      maxPeople: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </label>
            )}

            <div className="flex flex-wrap gap-2">
              {OFFERING_DAYS.map((day) => {
                const selected = editing.days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      selected
                        ? 'bg-[var(--c-ocean)] text-white'
                        : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
                    }`}
                    onClick={() =>
                      patchEditing({
                        days: selected
                          ? editing.days.filter((d) => d !== day)
                          : [...editing.days, day],
                      })
                    }
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--c-text-2)]">Desde</span>
                <input
                  type="time"
                  className="input input-bordered h-12 bg-white"
                  value={editing.startTime}
                  onChange={(e) => patchEditing({ startTime: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--c-text-2)]">Hasta</span>
                <input
                  type="time"
                  className="input input-bordered h-12 bg-white"
                  value={editing.endTime}
                  onChange={(e) => patchEditing({ endTime: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--c-text-2)]">
                  Duración (min)
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="input input-bordered h-12 bg-white"
                  placeholder="60"
                  value={editing.durationMinutes ?? ''}
                  onChange={(e) =>
                    patchEditing({
                      durationMinutes: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <label className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)]">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="input input-bordered w-full bg-white pl-7"
                  placeholder="450"
                  value={editing.price ?? ''}
                  onChange={(e) =>
                    patchEditing({ price: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </label>
              <select
                className="select select-bordered bg-white"
                value={editing.unit}
                onChange={(e) =>
                  patchEditing({ unit: e.target.value as CoachClassOffering['unit'] })
                }
              >
                {OFFERING_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[var(--c-ocean)]">
                Detalles (opcional)
              </span>
              <input
                className="input input-bordered bg-white"
                placeholder="Ej. Incluye evaluación inicial"
                value={editing.details || ''}
                onChange={(e) => patchEditing({ details: e.target.value })}
              />
            </label>

            <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-bg)] p-4">
              <p className="font-semibold text-[var(--c-ocean)]">
                {offeringHeadline(editing)}
              </p>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">{offeringWhen(editing)}</p>
              <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                {offeringPrice(editing)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--c-border)] pt-5">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={step === 1 ? cancelStepper : () => setStep((s) => s - 1)}
          >
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="btn bg-[var(--c-aqua)] text-white hover:bg-[var(--c-aqua-strong)]"
              disabled={!stepValid(step, editing)}
              onClick={() => setStep((s) => s + 1)}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className="btn bg-[var(--c-aqua)] text-white hover:bg-[var(--c-aqua-strong)]"
              onClick={() => {
                closeStepper()
                saveNow()
              }}
            >
              Guardar clase
            </button>
          )}
        </div>
      </ProfileSection>
    )
  }

  return (
    <ProfileSection
      title="Lugares, horarios y precios"
      description="Cada clase que ofreces: dónde la das, qué días y horario, y cuánto cuesta. Puedes tener una en un lugar fijo y otra a domicilio con precio distinto."
      summary={`${offerings.length} ${offerings.length === 1 ? 'clase' : 'clases'}`}
    >
      {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

      {offerings.length === 0 && (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-8 text-center text-sm text-[var(--c-text-2)]">
          Aún no agregas clases. Empieza con la primera.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {offerings.map((offering) => (
          <article
            key={offering.id}
            className="flex items-start justify-between gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-[var(--c-ocean)]">
                {offeringHeadline(offering)}
              </p>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">{offeringWhen(offering)}</p>
              <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                {offeringPrice(offering)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label="Editar clase"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setStep(1)
                  setEditingId(offering.id)
                }}
              >
                <FiEdit2 aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Quitar clase"
                className="btn btn-ghost btn-sm text-[var(--c-error,#b91c1c)]"
                onClick={() =>
                  setOfferings((current) => current.filter((o) => o.id !== offering.id))
                }
              >
                <FiTrash2 aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="btn btn-ghost self-start" onClick={startAdd}>
        <FiPlus /> Agregar clase
      </button>

      <div className="flex justify-end border-t border-[var(--c-border)] pt-5">
        <SaveButton
          status={saving ? 'saving' : autoStatus}
          onClick={saveNow}
          disabled={!!editingId}
          idleLabel="Guardado"
          savedLabel="Guardado"
        />
      </div>
    </ProfileSection>
  )
}
```

6. Update `startAdd` to also reset the step:

```tsx
  const startAdd = () => {
    const next = createOffering()
    setOfferings((current) => [...current, next])
    setStep(1)
    setEditingId(next.id)
  }
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: FAILS only in `athlete/coach/[id]/page.tsx` and `marketplace-preview.tsx`. NO errors under `components/coach/OfferingsCard.tsx`.

Run: `pnpm check`
Expected: no errors under `OfferingsCard.tsx` (run `pnpm format` if needed).

- [ ] **Step 3: Commit**

```bash
git add components/coach/OfferingsCard.tsx
git commit -m "feat(coach): OfferingsCard 3-step stepper + place photo upload

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire `OfferingsCard` into the coach profile page

**Files:**
- Modify: `app/(app)/coach/coach-profile/page.tsx`

- [ ] **Step 1: Swap the two cards for one**

In `app/(app)/coach/coach-profile/page.tsx`:

1. Remove the imports for `LocationsCard` and `PricingCard`; add `OfferingsCard`:

Replace:
```tsx
import LocationsCard from '@comps/coach/LocationsCard'
```
with:
```tsx
import OfferingsCard from '@comps/coach/OfferingsCard'
```
And delete the line:
```tsx
import PricingCard from '@comps/coach/PricingCard'
```

2. Delete the entire `<LocationsCard ... />` JSX block and the entire `<PricingCard ... />` JSX block.

3. In their place (where `<LocationsCard>` was, between `<SkillsCard />` and `<MediaCard />`), insert:

```tsx
      <OfferingsCard
        uid={uid}
        value={{
          classOfferings: pubVal.classOfferings,
          teachingLocations: pubVal.teachingLocations,
          priceOptions: pubVal.priceOptions,
          galleryPhotos: pubVal.galleryPhotos,
        }}
        saving={savingSection === 'offerings'}
        onSave={(v) => savePublic('offerings', v)}
      />
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: FAILS only in `athlete/coach/[id]/page.tsx` and `marketplace-preview.tsx`. `coach-profile/page.tsx` clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/coach/coach-profile/page.tsx"
git commit -m "feat(coach): use OfferingsCard in coach profile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Public profile + athlete booking view render offerings

**Files:**
- Modify: `components/coach/CoachPublicProfile.tsx`
- Modify: `app/(app)/athlete/coach/[id]/page.tsx`

- [ ] **Step 1: `CoachPublicProfile` — replace the two sections with offerings**

In `components/coach/CoachPublicProfile.tsx`:

1. Add import near the other imports:
```tsx
import {
  offeringHeadline,
  offeringPrice,
  offeringWhen,
  resolveOfferings,
} from '@/lib/coach-offerings'
```

2. After the `const metrics = ...` line, add:
```tsx
  const offerings = resolveOfferings(coach)
```

3. Replace BOTH the `{!!coach.teachingLocations?.length && ( ... )}` block and the `{!!coach.priceOptions?.length && ( ... )}` block (everything from the first to the end of the second) with a single block:

```tsx
      {offerings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">Clases</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {offerings.map((offering) => (
              <article
                key={offering.id}
                className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4"
              >
                <div className="flex gap-3">
                  {offering.imageUrl && (
                    <img
                      src={offering.imageUrl}
                      alt={offering.placeName || 'Lugar de clases'}
                      className="h-20 w-20 rounded-[var(--r-sm)] object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--c-ocean)]">
                      {offeringHeadline(offering)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--c-text-2)]">
                      {offeringWhen(offering)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                      {offeringPrice(offering)}
                    </p>
                    {offering.locationUrl && (
                      <a
                        href={offering.locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm font-semibold text-[var(--c-aqua-strong)] underline"
                      >
                        Ver ubicación
                      </a>
                    )}
                    {offering.details && (
                      <p className="mt-1 text-sm text-[var(--c-text-2)]">
                        {offering.details}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
```

- [ ] **Step 2: `athlete/coach/[id]/page.tsx` — show price/modality from selection**

In `app/(app)/athlete/coach/[id]/page.tsx`:

1. Delete the `function priceSummary(coach: CoachPublic) { ... }` helper entirely.
2. Remove the now-unused `CoachPublic` import if it becomes unused — check: it is still used by `CoachDetail`, so keep the import.
3. Replace the Precio `<div>` inside the `<dl>` (the block whose `<dt>` is "Precio") with two cells — price and modalidad:

Replace:
```tsx
          <div className="rounded-2xl bg-[var(--c-surface)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-[var(--c-text-2)]">Precio</dt>
            <dd className="mt-1 font-semibold text-[var(--c-ocean)]">{priceSummary(coach)}</dd>
          </div>
```
with:
```tsx
          <div className="rounded-2xl bg-[var(--c-surface)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-[var(--c-text-2)]">Precio</dt>
            <dd className="mt-1 font-semibold text-[var(--c-ocean)]">
              {bookingSelection.price !== null
                ? `$${bookingSelection.price} ${
                    {
                      clase: 'por clase',
                      sesión: 'por sesión',
                      mes: 'por mes',
                      paquete: 'por paquete',
                    }[bookingSelection.unit]
                  }`
                : 'Precio por definir'}
              {bookingSelection.durationMinutes
                ? ` · ${bookingSelection.durationMinutes} min`
                : ''}
            </dd>
          </div>
          <div className="rounded-2xl bg-[var(--c-surface)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-[var(--c-text-2)]">
              Modalidad
            </dt>
            <dd className="mt-1 font-semibold text-[var(--c-ocean)]">
              {bookingSelection.mode === 'home' ? '🏠 A domicilio' : '📍 Lugar fijo'} ·{' '}
              {bookingSelection.groupType === 'grupal' ? 'Grupal' : 'Particular'}
            </dd>
          </div>
```

4. The `<dl>` currently has `sm:grid-cols-3`. With the added cell there are now 4; change `sm:grid-cols-3` to `sm:grid-cols-2` on that `<dl>` so the cells wrap evenly.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: FAILS only in `components/marketing/marketplace-preview.tsx`.

Run: `pnpm check`
Expected: no errors in the two modified files (run `pnpm format` if needed).

- [ ] **Step 4: Commit**

```bash
git add components/coach/CoachPublicProfile.tsx "app/(app)/athlete/coach/[id]/page.tsx"
git commit -m "feat(coach): render offerings in public profile + booking view

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Completeness + marketplace preview

**Files:**
- Modify: `lib/coach-completeness.ts`
- Modify: `components/marketing/marketplace-preview.tsx`

- [ ] **Step 1: Completeness uses offerings**

In `lib/coach-completeness.ts`, add import at top:
```ts
import { resolveOfferings } from '@/lib/coach-offerings'
```
Replace:
```ts
  const hasLocation = !!pubVal.teachingLocations?.length
```
with:
```ts
  const hasLocation = resolveOfferings(pubVal).length > 0
```
Leave the `'Lugar y horarios'` label line unchanged.

- [ ] **Step 2: Marketplace preview reads offerings**

In `components/marketing/marketplace-preview.tsx`:

1. Replace the import from `@/lib/coach-booking` to add nothing new, but add a new import:
```tsx
import {
  offeringsAvailabilitySummary,
  offeringsPriceSummary,
  resolveOfferings,
} from '@/lib/coach-offerings'
```

2. Replace the `availabilitySummary` and `priceSummary` helper functions with:
```tsx
function availabilitySummary(coach: PublicCoachDirectoryItem) {
  return offeringsAvailabilitySummary(resolveOfferings(coach))
}

function priceSummary(coach: PublicCoachDirectoryItem) {
  return offeringsPriceSummary(resolveOfferings(coach))
}
```

3. In the expanded section, the condition `{coach.teachingLocations?.length ? (` gates the slot list. Replace that opening condition with `{resolveOfferings(coach).length ? (` and its matching `) : (` "Aún no publica horarios." branch stays.

4. Delete the entire `{!!coach.priceOptions?.length && ( ... )}` block (prices now shown via offering slot labels and the summary). The slot buttons already use `formatSlotLabel(selection)`; additionally show price by replacing the `selectedSelection` summary block's location paragraph. Replace:
```tsx
                            <p className="text-sm font-semibold text-[var(--c-ocean)]">
                              {selectedSelection.locationName}
                            </p>
                            <p className="mt-1 text-sm text-[var(--c-text-2)]">
                              {formatSlotLabel(selectedSelection)}
                            </p>
```
with:
```tsx
                            <p className="text-sm font-semibold text-[var(--c-ocean)]">
                              {selectedSelection.mode === 'home' ? '🏠 ' : '📍 '}
                              {selectedSelection.locationName}
                            </p>
                            <p className="mt-1 text-sm text-[var(--c-text-2)]">
                              {formatSlotLabel(selectedSelection)}
                              {selectedSelection.durationMinutes
                                ? ` · ${selectedSelection.durationMinutes} min`
                                : ''}
                            </p>
                            <p className="mt-1 text-sm font-bold text-[var(--c-ocean)]">
                              {selectedSelection.price !== null
                                ? `$${selectedSelection.price} ${
                                    {
                                      clase: 'por clase',
                                      sesión: 'por sesión',
                                      mes: 'por mes',
                                      paquete: 'por paquete',
                                    }[selectedSelection.unit]
                                  }`
                                : 'Precio por definir'}
                            </p>
```

- [ ] **Step 3: Verify (full clean)**

Run: `pnpm typecheck`
Expected: PASS — zero errors across the project.

Run: `pnpm check`
Expected: no errors (run `pnpm format` then re-check if Biome flags formatting).

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/coach-completeness.ts components/marketing/marketplace-preview.tsx
git commit -m "feat(coach): offerings drive completeness + marketplace preview

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Remove dead legacy components + e2e smoke

**Files:**
- Delete: `components/coach/LocationsCard.tsx`
- Delete: `components/coach/PricingCard.tsx`
- Create: `e2e/coach-offerings.spec.ts`

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn "LocationsCard\|PricingCard" app components lib --include="*.ts" --include="*.tsx"`
Expected: NO results. If any appear, fix them before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm components/coach/LocationsCard.tsx components/coach/PricingCard.tsx
```

- [ ] **Step 3: Add a public e2e smoke for offering summary**

Inspect an existing spec for the project's Playwright conventions:
Run: `ls e2e && sed -n '1,40p' e2e/*.spec.ts | head -60`

Create `e2e/coach-offerings.spec.ts` following the same import/test style observed. Use this as the baseline (adjust `baseURL`/selectors only if the existing specs use a different convention):

```ts
import { expect, test } from '@playwright/test'

// Public marketing marketplace must render without runtime errors after the
// offerings refactor. We don't assert on specific coach data (depends on the
// live Firestore directory); we assert the section mounts and no console
// error mentions coach-offerings/booking helpers.
test('marketplace preview renders after offerings refactor', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/#coaches')
  await expect(page.getByRole('heading', { name: /Encuentra un coach/i })).toBeVisible()
  // either coaches load or the empty/loading state shows — both are valid
  await expect(
    page.locator('text=/Cargando coaches|coach|Aún no encontramos/i').first()
  ).toBeVisible()
  expect(errors.join('\n')).not.toMatch(/coach-offerings|coach-booking|resolveOfferings/)
})
```

- [ ] **Step 4: Run e2e**

Run: `pnpm test:e2e --grep "marketplace preview renders after offerings refactor"`
Expected: PASS. If the suite requires `NEXT_PUBLIC_FIREBASE_CONFIG` and it is absent in the environment, document that the test is skipped due to missing env (do NOT fake the config) and rely on `pnpm build` from Task 9 as the gate.

- [ ] **Step 5: Final verify + commit**

Run: `pnpm typecheck` → PASS
Run: `pnpm check` → no errors

```bash
git add -A
git commit -m "chore(coach): remove legacy Locations/Pricing cards + offerings e2e

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Manual QA checklist (after Task 10)

Run `pnpm dev` and verify:

- [ ] Coach profile shows one "Lugares, horarios y precios" section (no separate Precios).
- [ ] A coach with legacy `teachingLocations` sees them migrated as offerings on load (fixed mode, particular, derived id).
- [ ] "Agregar clase" → stepper: paso 1 toggle Lugar fijo/A domicilio (zona is single field for home), paso 2 tipo + cupo (grupal) + day pills + horas + duración, paso 3 precio + unidad + detalles + live preview.
- [ ] "Siguiente" disabled until required fields of the step are filled; "Guardar clase" returns to the list and the card shows the sentence summary.
- [ ] Editing a card reopens the stepper with values; cancel on a fresh add drops the empty offering.
- [ ] Autosave persists after closing the stepper; reload shows the saved offerings.
- [ ] Marketplace card shows "N clases" + cheapest price; expanded slot list shows modality icon + price; "Agendar" routes to booking.
- [ ] Booking confirm screen shows Lugar, Horario, Precio (with duration) and Modalidad; old booking links (with `locationId`) still resolve.
- [ ] Public coach profile shows a single "Clases" section.
- [ ] Completeness: a coach with ≥1 offering no longer sees "Lugar y horarios" missing.

## Spec coverage notes

- Data model (Task 1) · migration + formatters (Task 2) · booking snapshot (Tasks 3–4, 8) · UI summary+stepper (Tasks 5–7) · public profile (Task 8) · completeness (Task 9) · marketplace (Task 9) · legacy cleanup (Task 10). Out-of-scope items from the spec (structured zones, capacity enforcement, cancellation policy, recurring dates, deleting legacy data) are intentionally not implemented.
