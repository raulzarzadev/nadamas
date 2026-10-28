# School Home: Dashboard, Events & Simple Customization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the school public home into a member dashboard (next classes per profile, events, recent classes) with a visitor view (public events, join button), coordinator-managed events, and simple customization (cover photo, gallery, custom color, section order).

**Architecture:** All new data is server-owned (Firebase Admin via `lib/server/*` + `app/api/schools/[schoolId]/...` routes guarded by `requireSchoolAccess`), matching `schoolLocations`. The public page stays server-rendered for visitors/SEO; a client component upgrades it to the member dashboard after Firebase Auth resolves, by calling an authed `GET /api/schools/[schoolId]/home`. Images upload from the client to Storage like the existing logo uploader.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Firebase 12 (client) + firebase-admin, Tailwind v4 + daisyUI v5, Playwright (`pnpm test:e2e`), Biome.

**Spec:** `docs/superpowers/specs/2026-10-28-school-home-events-design.md`

## Global Constraints

- Only the coordinator (school role `director`, or global admin as `requireSchoolAccess` already allows) creates/edits events and home settings.
- Private events are visible only to active school members — never in server HTML for visitors, never from a public API, never via client Firestore reads.
- Empty sections are never rendered (anti-goal "recargada"). With zero configuration the home must look like today.
- Events: date (`YYYY-MM-DD`), optional time (`HH:mm`), title, description, at most **one** photo, optional links (label + URL), visibility `public` | `private`.
- "Upcoming" = event date ≥ today in `school.timezone`; upcoming sorted ascending; past sorted descending. Home shows **3** upcoming.
- Gallery max **24** photos. Event links max **5**.
- Hero and the join button can't be hidden; member's personal sections (next classes, recent classes) always render first.
- UI copy in Spanish, code/route paths in English. Tailwind v4 shorthand `text-(--c-x)`.
- Errors: never show raw errors; use `GENERIC_USER_ERROR` / `reportInternalError` from `lib/user-facing-error.ts`.
- No Firestore access from components; client uses `getAuthed/postAuthed/patchAuthed/deleteAuthed` (`lib/client/authed-api.ts`).
- Format/lint with Biome only. Do not push (user pushes).

## Review Focus

1. **Private event leak** — a logged-out visitor or a non-member with a session calls `GET /api/schools/[id]/events` or loads `/school/[slug]` → no private event appears anywhere (Task 4 + Task 7 tests).
2. **Timezone edge** — an event dated today in `America/Mexico_City` while UTC is already tomorrow → still listed as upcoming (Task 4 pure test).
3. **Non-member with session on a non-public school** — sees "Esta escuela no está disponible", not a crash and not school data (Task 8 test).
4. **Unsafe URLs** — `javascript:` links or non-Storage image URLs in events/gallery/cover are rejected with 400 (Tasks 2 and 5 tests).
5. **Family with a profile that has no classes** — that profile is omitted; if none has classes the "Próximos entrenos" section is hidden (Task 6 test).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/school-theme.ts` (new) | Hex validation, derive a palette from one color, resolve a school's palette |
| `lib/school-home.ts` (new) | Home section keys, defaults, normalization; gallery photo type |
| `lib/school-events.ts` (new) | `SchoolEvent` type, input normalization, upcoming/past split |
| `lib/server/school-events.ts` (new) | Firestore CRUD for `schoolEvents` |
| `lib/server/school-member-home.ts` (new) | Viewer's student profiles, next class, recent summary |
| `lib/server/schools.ts` (modify) | Export image URL check; `updateSchoolHomeSettings` |
| `lib/school.ts` (modify) | New optional `School` fields |
| `firebase/school-logos/main.ts` (modify) | Generic `uploadSchoolImage` |
| `app/api/schools/[schoolId]/home-settings/route.ts` (new) | PATCH cover/color/gallery/sections |
| `app/api/schools/[schoolId]/events/route.ts`, `.../events/[eventId]/route.ts` (new) | Events API |
| `app/api/schools/[schoolId]/home/route.ts` (new) | Member dashboard data |
| `components/school/SchoolHomeAppearanceCard.tsx` (new) | Settings: cover, color, gallery, sections, "te falta" hints |
| `components/school/SchoolEventsCard.tsx` (new) | Settings: events list + form |
| `components/school/home/*` (new) | Public home pieces: hero, events list, gallery, join button, member dashboard, private gate |
| `components/school/SchoolPublicHome.tsx` (modify) | Compose sections in order |
| `app/(marketing)/school/[slug]/page.tsx` (modify), `.../events/page.tsx` (new) | Routing, metadata, past events |

---

### Task 1: Custom color theme

**Files:**
- Create: `lib/school-theme.ts`
- Modify: `lib/school.ts` (add `customColor?: string | null` to `School`), `app/layout.tsx` (tenant palette), `components/school/SchoolPublicHome.tsx` (palette lookup)
- Test: `e2e/school-theme.spec.ts`

**Interfaces:**
- Produces: `isHexColor(value: unknown): value is string` (accepts `#rrggbb` only, case-insensitive); `paletteFromHex(hex: string): { primary: string; secondary: string; accent: string; surface: string }`; `resolveSchoolPalette(school: Pick<School, 'palette' | 'customColor'>): { primary; secondary; accent; surface }` — `customColor` wins when valid, else `SCHOOL_PALETTES` entry, else `SCHOOL_PALETTES[0]`.

- [ ] **Step 1: Write failing pure tests** in `e2e/school-theme.spec.ts` (no browser, import from `../lib/school-theme`):
  - `isHexColor('#7C3AED') === true`, `isHexColor('7c3aed') === false`, `isHexColor('#fff') === false`, `isHexColor('red') === false`.
  - For `paletteFromHex('#7c3aed')`: every value matches `/^#[0-9a-f]{6}$/`; contrast ratio (WCAG relative luminance, helper written in the test) of `#ffffff` on `primary` ≥ 4.5; contrast of `primary` on `surface` ≥ 4.5.
  - Same contrast assertions for a very light input `#fde047` and a very dark one `#0a0a0a`.
  - `resolveSchoolPalette({ palette: 'coral', customColor: null }).primary === '#641c2b'`; with `customColor: '#7c3aed'` returns `paletteFromHex('#7c3aed')`; with `customColor: 'nope'` falls back to coral.
- [ ] **Step 2: Run** `pnpm test:e2e e2e/school-theme.spec.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `lib/school-theme.ts`. Approach: convert to HSL; `primary` = same hue darkened until white-on-primary ≥ 4.5; `secondary` = input hue at mid lightness; `accent` = hue at ~85% lightness; `surface` = hue at ~97% lightness, low saturation.
- [ ] **Step 4: Run** the spec — Expected: PASS.
- [ ] **Step 5: Wire it:** replace the `SCHOOL_PALETTES.find(...)` lookups in `app/layout.tsx` (both `generateViewport` and `RootLayout`) and `SchoolPublicHome.tsx` with `resolveSchoolPalette(school)`. Run `pnpm typecheck` — Expected: no errors.
- [ ] **Step 6: Commit** `feat(school): derive theme from a custom color`.

### Task 2: Home settings model + API (cover, color, gallery, sections)

**Files:**
- Create: `lib/school-home.ts`, `app/api/schools/[schoolId]/home-settings/route.ts`
- Modify: `lib/school.ts` (`School` gains `coverUrl?: string | null`, `gallery?: SchoolGalleryPhoto[]`, `homeSections?: SchoolHomeSection[]`), `lib/server/schools.ts`
- Test: `e2e/school-home-settings.spec.ts`

**Interfaces:**
- Consumes: `isHexColor` (Task 1).
- Produces:
  - `type SchoolHomeSection = 'events' | 'gallery' | 'contacts'`; `DEFAULT_HOME_SECTIONS: SchoolHomeSection[] = ['events', 'gallery', 'contacts']` (no `coaches` key in v1: the school home has no public coach list today; adding one is out of scope); `normalizeHomeSections(value: unknown): SchoolHomeSection[] | null` — array of unique known keys (any order, may omit = hidden), `null` if invalid; `homeSectionsOf(school): SchoolHomeSection[]` (stored or default).
  - `interface SchoolGalleryPhoto { id: string; url: string; createdAt: number }`; `MAX_GALLERY_PHOTOS = 24`.
  - In `lib/server/schools.ts`: export `isAllowedSchoolImageUrl(value: string): boolean` (rename of `isAllowedLogoUrl`, keep the logo call site), and `updateSchoolHomeSettings(schoolId: string, input: { coverUrl?: string | null; customColor?: string | null; gallery?: SchoolGalleryPhoto[]; homeSections?: SchoolHomeSection[] }): Promise<School | null>` (merge-updates only provided keys + `updatedAt`).
  - `PATCH /api/schools/[schoolId]/home-settings` body: any subset of `{ coverUrl: string|null, customColor: string|null, galleryUrls: string[], homeSections: string[] }`. Director only. `galleryUrls` replaces the gallery (keep `id`/`createdAt` for URLs already present, new ids via `crypto.randomUUID()`). Responds `{ school }`. 400 messages: cover `'La foto de portada no es válida.'`, color `'Elige un color válido.'`, gallery `'Revisa las fotos de la galería (máximo 24).'`, sections `'Las secciones no son válidas.'`.

- [ ] **Step 1: Write failing tests** in `e2e/school-home-settings.spec.ts`:
  - Pure: `normalizeHomeSections(['gallery','events']) → ['gallery','events']`; `(['events','events']) → null`; `(['hero']) → null`; `([]) → []`; `('x') → null`.
  - API (skip without emulators, follow `e2e/school-logo.spec.ts` login + `/school/create` pattern to get a director token, or seed via emulator REST like other school specs): director PATCH `{ customColor: '#7c3aed', homeSections: ['gallery','events'] }` → 200 and echoed; PATCH `{ coverUrl: 'https://evil.com/x.png' }` → 400; `{ galleryUrls: 25 × valid emulator Storage URL }` → 400; a teacher member → 403; unauthenticated → 401.
- [ ] **Step 2: Run** `pnpm test:e2e e2e/school-home-settings.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `lib/school-home.ts`, the `schools.ts` additions, and the route (pattern: `app/api/schools/[schoolId]/locations/route.ts`, wrap PATCH with `withSchoolAgendaUpdate` only if that is how other settings invalidate; otherwise plain export).
- [ ] **Step 4: Run** spec — Expected: PASS. `pnpm typecheck` clean.
- [ ] **Step 5: Commit** `feat(school): home settings API for cover, color, gallery and sections`.

### Task 3: Coordinator appearance card (cover, color, gallery, sections, hints)

**Files:**
- Create: `components/school/SchoolHomeAppearanceCard.tsx`
- Modify: `firebase/school-logos/main.ts`, `components/school/SchoolSettings.tsx` (render the card for `canManage`, next to `SchoolLocationsCard`)
- Test: `e2e/school-home-appearance.spec.ts`

**Interfaces:**
- Consumes: Task 2 route, `MAX_GALLERY_PHOTOS`, `DEFAULT_HOME_SECTIONS`, `SCHOOL_PALETTES`, `resolveSchoolPalette`.
- Produces: `uploadSchoolImage(file: File, folder: 'school-covers' | 'school-gallery' | 'school-events', onProgress: (progress: number) => void): Promise<string>` in `firebase/school-logos/main.ts` (path `${folder}/${uid}/${uuid}`); `uploadSchoolLogo` becomes a call to it with `'school-logos'` (widen the union to include it). `SchoolHomeAppearanceCard({ school, onUpdated }: { school: School; onUpdated: (school: School) => void })`.

UI (Spanish copy fixed here):
- "Foto de portada": upload / "Quitar".
- "Color": the 6 palette swatches + "Color propio" (`<input type="color">`); choosing a palette clears `customColor`.
- "Galería" with counter `N de 24`, add (multi-file), remove per photo.
- "Secciones de tu página": one row per `SchoolHomeSection` with labels `Eventos`, `Galería`, `Contacto`, a visibility toggle and ↑/↓ buttons (accessible labels `Subir <label>` / `Bajar <label>`).
- "Para completar tu página" hint list, shown only while missing, never blocking: no cover → `Agrega una foto de portada`; gallery empty → `Sube algunas fotos a la galería`; no upcoming events → `Publica tu próximo evento` (uses Task 4's GET; render this hint after Task 4 lands — until then omit it).

- [ ] **Step 1: Write failing e2e** (emulators, director session, 320px viewport like `school-logo.spec.ts`): upload a canvas PNG as cover → reload settings → cover preview visible; pick "Color propio" `#7c3aed` → public `/school/<slug>` has `--school-primary` equal to `paletteFromHex('#7c3aed').primary`; hide "Galería" and move "Contacto" up → PATCH body persisted (`GET` school shows `homeSections` order); page has no horizontal scroll at 320px.
- [ ] **Step 2: Run** `pnpm test:e2e e2e/school-home-appearance.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** uploader + card.
- [ ] **Step 4: Run** — Expected: PASS. Run `e2e/school-logo.spec.ts` too — Expected: still PASS.
- [ ] **Step 5: Commit** `feat(school): appearance settings card`.

### Task 4: Events data + API

**Files:**
- Create: `lib/school-events.ts`, `lib/server/school-events.ts`, `app/api/schools/[schoolId]/events/route.ts`, `app/api/schools/[schoolId]/events/[eventId]/route.ts`
- Test: `e2e/school-events.spec.ts`

**Interfaces:**
- Produces:
  - `interface SchoolEventLink { label: string; url: string }`
  - `interface SchoolEvent { id: string; schoolId: string; date: string; time: string | null; title: string; description: string; photoUrl: string | null; links: SchoolEventLink[]; visibility: 'public' | 'private'; createdBy: string; createdAt: number; updatedAt: number }`
  - `normalizeSchoolEventInput(body: unknown): { ok: true; value: Omit<SchoolEvent, 'id' | 'schoolId' | 'createdBy' | 'createdAt' | 'updatedAt'> } | { ok: false; reason: 'date' | 'time' | 'title' | 'description' | 'photo' | 'links' | 'visibility' }` — title 2–120 chars, description ≤ 2000, links ≤ 5 each label 1–60 and `isSafeSchoolUrl` + non-empty, photo validated by an injected `isAllowedImage: (url: string) => boolean` parameter (2nd arg) so the pure function stays client-safe.
  - `splitSchoolEvents(events: SchoolEvent[], timezone: string, now?: number): { upcoming: SchoolEvent[]; past: SchoolEvent[] }`.
  - Server (`schoolEvents` collection, docs carry `schoolId`): `listSchoolEvents(schoolId: string, { includePrivate }: { includePrivate: boolean }): Promise<SchoolEvent[]>`, `createSchoolEvent(schoolId, userId, value)`, `updateSchoolEvent(schoolId, eventId, value): Promise<SchoolEvent | null>` (null if event belongs to another school), `deleteSchoolEvent(schoolId, eventId): Promise<boolean>`.
  - `GET /api/schools/[schoolId]/events?scope=upcoming|past` → `{ events }`: active member (any role) gets public+private; anyone else (no token, or token but not member) gets public only, and only if the school `isPublic`, else 404. `POST` (director) → 201 `{ event }`. `PATCH`/`DELETE /events/[eventId]` (director).
  - Error copy: date `'Elige una fecha válida.'`, time `'La hora no es válida.'`, title `'Escribe un título (2 a 120 caracteres).'`, description `'La descripción es demasiado larga.'`, photo `'La foto no es válida.'`, links `'Revisa los enlaces (máximo 5).'`, visibility `'Elige si el evento es público o privado.'`.
- No `firestore.rules` change: `schoolEvents` has no match block, so client access stays denied (same as `schoolLocations`).

- [ ] **Step 1: Write failing tests** in `e2e/school-events.spec.ts`:
  - Pure `splitSchoolEvents`: with `now = Date.parse('2026-11-10T03:00:00Z')` (still Nov 9 in `America/Mexico_City`), an event dated `2026-11-09` is upcoming; `2026-11-08` is past; upcoming ascending, past descending.
  - Pure `normalizeSchoolEventInput`: rejects link `javascript:alert(1)` (`links`), 6 links (`links`), title `'a'` (`title`), visibility `'secret'` (`visibility`); accepts a minimal `{ date, title, visibility: 'public' }` with `time: null`, `links: []`, `photoUrl: null`.
  - API (emulators): director creates one public + one private upcoming event; unauthenticated GET → only the public one; a logged-in non-member → only the public one; a student member → both; teacher POST → 403; PATCH with event id of another school → 404; DELETE → 200 then GET excludes it.
- [ ] **Step 2: Run** `pnpm test:e2e e2e/school-events.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the four files (route pattern as `locations/route.ts`; optional-auth via `getSchoolCaller` + `getSchoolMembership`, as `agenda/route.ts` does for `view=public`).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(school): events API with public/private visibility`.

### Task 5: Coordinator events card

**Files:**
- Create: `components/school/SchoolEventsCard.tsx`
- Modify: `components/school/SchoolSettings.tsx` (render for `canManage`), `components/school/SchoolHomeAppearanceCard.tsx` (enable the `Publica tu próximo evento` hint)
- Test: extend `e2e/school-events.spec.ts`

**Interfaces:**
- Consumes: Task 4 API + types, `uploadSchoolImage(..., 'school-events')`.
- Produces: `SchoolEventsCard({ schoolId }: { schoolId: string })`.

UI: heading `Eventos`, button `Nuevo evento`; form fields `Fecha`, `Hora (opcional)`, `Título`, `Descripción`, `Foto (opcional)`, `Enlaces (opcional)` (rows label+URL, `Agregar enlace`, max 5), radio `Público` / `Privado (solo miembros)`; list split into `Próximos` and `Pasados` with `Editar` / `Eliminar` (confirm inline, no `window.confirm`).

- [ ] **Step 1: Write failing e2e:** director creates "Travesía La Paz" (public, with Maps link) via the card → appears under `Próximos`; edits title → updated; deletes → gone.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(school): manage events from school settings`.

### Task 6: Member home data

**Files:**
- Create: `lib/server/school-member-home.ts`, `app/api/schools/[schoolId]/home/route.ts`
- Modify: `app/api/schools/[schoolId]/agenda/route.ts` (use the extracted viewer-student helper), `lib/school-student-history.ts` (add `pending: boolean` to `SchoolHistoryClass`; true when the booking `status === 'pending'`), `lib/server/school-student-history.ts` (populate it)
- Test: `e2e/school-member-home.spec.ts`

**Interfaces:**
- Consumes: `getSchoolStudentHistory(student, timezone)` (existing), `listSchoolEvents` + `splitSchoolEvents` (Task 4), `resolveSchoolPalette` (Task 1).
- Produces:
  - `viewerSchoolStudents(schoolId: string, viewerId: string): Promise<SchoolStudent[]>` — the filter now inline in `agenda/route.ts` lines ~180–196 (`studentUserId`, `guardianId`, `managerIds`, `guardianIds`), active students only.
  - `interface MemberHomeProfile { studentId: string; name: string; nextClass: { title: string; date: string; startTime: string; location: string; pending: boolean } | null; week: { taken: number; total: number } }` — `nextClass` = earliest history class with status `scheduled`; `week` counts this week (Monday–Sunday in school timezone) classes with status `taken` (taken) over `taken + absent` (total).
  - `getSchoolMemberHome(school: School, viewer: { uid: string; name: string }): Promise<{ greetingName: string; profiles: MemberHomeProfile[]; events: SchoolEvent[] }>` — `profiles` excludes profiles with `nextClass === null && week.total === 0`; `events` = upcoming public+private, first 3.
  - `GET /api/schools/[schoolId]/home` (any active member; 403 otherwise) → `{ school: { id, name, slug, logoUrl, coverUrl, palette: resolveSchoolPalette(school) }, greetingName, profiles, events }`.

- [ ] **Step 1: Write failing e2e** (emulators): seed a guardian with two student profiles in one school — one with a confirmed class tomorrow and one taken + one no-show class this week, the other with nothing; GET `/home` as guardian → `profiles.length === 1`, `nextClass.pending === false`, `week` `{ taken: 1, total: 2 }`; add a pending request for tomorrow-earlier for the same student → `nextClass.pending === true`; GET as non-member → 403.
- [ ] **Step 2: Run** `pnpm test:e2e e2e/school-member-home.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement**; keep `agenda/route.ts` behavior identical.
- [ ] **Step 4: Run** this spec plus `e2e/school-student-history.spec.ts` and `e2e/agenda-student-actions.spec.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(school): member home data endpoint`.

### Task 7: Public home + member dashboard

**Files:**
- Create in `components/school/home/`: `SchoolHero.tsx` (server; `size: 'large' | 'small'`, cover with dark overlay, optional `greetingName`), `SchoolEventsList.tsx` (server-safe presentational; `events`, `showPrivateTag`, link `Ver eventos pasados` → `/school/{slug}/events`), `SchoolGallery.tsx` (client; grid of up to 6 + `Ver todas (N)`, tap opens full-size dialog with `<dialog>`; renders nothing when empty), `SchoolJoinButton.tsx` (client), `SchoolMemberDashboard.tsx` (client)
- Modify: `components/school/SchoolPublicHome.tsx`, `app/(marketing)/school/[slug]/page.tsx` (load public upcoming events server-side; OG image = `coverUrl` ?? `logoUrl` ?? `/og-nadamas.png`)
- Test: `e2e/school-public-home.spec.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 5, 7; `POST /api/schools/[schoolId]/access-requests` (existing).
- Produces: `SchoolPublicHome({ school, publicEvents }: { school: School; publicEvents: SchoolEvent[] })`.

Behavior:
- Visitor render (server): large hero → `SchoolJoinButton` (primary; existing `Explorar horarios de la escuela` becomes secondary) → sections in `homeSectionsOf(school)` order, each skipped when empty (`events` uses 3 upcoming public; `gallery`; `contacts` = existing `SchoolPublicContacts`).
- `SchoolJoinButton`: label `Solicitar unirme al equipo`. Signed out → link to `/login?redirectTo=` + `encodeURIComponent('/school/{slug}?join=1')`. Signed in → `postAuthed` the access-request; on `request.status === 'pending'` show `Solicitud enviada`; on `approved` hide the button. On mount with `?join=1` and a session, send automatically once. Errors → `GENERIC_USER_ERROR`.
- `SchoolMemberDashboard`: the marketing layout has no `UserProvider`, so subscribe with `onAuthStateChanged(auth, …)` from `firebase/auth` + `auth` from `@/firebase/index`; when signed in call `getAuthed('/api/schools/{id}/home')`; on 200 replace the visitor body with layout A: small hero `Hola, {greetingName}` → `Próximos entrenos` (one card per profile: `{name} · {día} {hora}`, second line `{title} · {location}`, tag `Pendiente de confirmar` when pending) → `Próximos eventos` (tag `Privado` on private) → `Últimas clases` (`{name}: {taken} de {total} esta semana`) → the remaining sections in coordinator order. Any non-200 or error → keep the visitor view silently.

- [ ] **Step 1: Write failing e2e:** (a) visitor on `/school/<slug>` sees the public event title, not the private one (also assert the private title is absent from `await page.content()`), sees `Solicitar unirme al equipo`; a school with no events/gallery shows neither section heading; (b) signed-in member sees `Hola,`, `Próximos entrenos`, the private event with `Privado`; (c) signed-out click on join → lands on `/login` with `redirectTo` containing `join%3D1`; after login, back on the school page → `Solicitud enviada`; (d) 320px viewport, no horizontal scroll.
- [ ] **Step 2: Run** `pnpm test:e2e e2e/school-public-home.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** this spec + `e2e/tenant-workspace.spec.ts` + `e2e/school-access-requests.spec.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(school): member dashboard and visitor home with events and gallery`.

### Task 8: Past events page + non-public schools for members

**Files:**
- Create: `app/(marketing)/school/[slug]/events/page.tsx`, `components/school/home/SchoolPrivateGate.tsx` (client)
- Modify: `app/(marketing)/school/[slug]/page.tsx`
- Test: `e2e/school-public-home.spec.ts` (extend)

**Interfaces:**
- Consumes: Task 4 (`scope=past`), Task 6 `/home` response, Task 7 components.
- Produces: `SchoolPrivateGate({ schoolId }: { schoolId: string })`.

Behavior:
- `/school/[slug]/events`: heading `Eventos pasados`, server-renders past **public** events (only if `isPublic`); a client island upgrades to public+private past events for members via `getAuthed('/api/schools/{id}/events?scope=past')`. Not-public school → same gate as below. Proxy already passes `/school/*` through on tenant subdomains, so no `proxy.ts` change.
- `/school/[slug]` when `isPublic === false`: do **not** `notFound()`; metadata `{ title: 'Escuela', robots: { index: false, follow: false } }` with no name/description/image; render `SchoolPrivateGate`, which waits for auth, calls `/home`, and on 200 renders `SchoolMemberDashboard` from the response's `school` data; signed out → `Inicia sesión para ver tu escuela` + login link with `redirectTo`; non-member/other error → `Esta escuela no está disponible.`. Unknown slug still `notFound()`.

- [ ] **Step 1: Write failing e2e:** non-public school — visitor HTML contains neither the school name nor its description and shows the login prompt; signed-in non-member sees `Esta escuela no está disponible.`; signed-in member sees `Hola,`; `/school/<public-slug>/events` lists a past public event and not a past private one for visitors, and both for a member.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full suite touched by this plan: `pnpm test:e2e e2e/school-theme.spec.ts e2e/school-home-settings.spec.ts e2e/school-home-appearance.spec.ts e2e/school-events.spec.ts e2e/school-member-home.spec.ts e2e/school-public-home.spec.ts e2e/tenant-workspace.spec.ts e2e/school-logo.spec.ts` + `pnpm typecheck` + `pnpm biome check` on changed files — Expected: all pass.
- [ ] **Step 5: Commit** `feat(school): past events page and member access to non-public schools`.
