# Planes de escuela (Básico con límites + Personalizado) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El plan Básico ($299 MXN/mes, 30 días de prueba) limita cada escuela a 5 profes y 100 alumnos. Pasado ese límite, el alta se bloquea en el servidor y se muestra "Contáctanos". Un admin puede pasar una escuela a Personalizado: exenta de pago en la app, con límites propios.

**Architecture:**
- **Funciones puras** en `lib/subscriptions/plans.ts`: límites del plan y conteo de lugares.
- **Helper de servidor** `lib/server/subscriptions/seats.ts`. Se llama dentro de cada transacción que deja activo a un alumno o profe.
  - Lee un doc candado por escuela (`schoolSeatLocks/{schoolId}`) y lo escribe al reclamar el lugar.
  - Así las transacciones de Firestore Admin, que bloquean los docs que leen, quedan en serie.
- **Límites propios** en `SchoolSubscription.customLimits`.
- **Una sola fuente de números:** `lib/pricing.ts`.

**Tech Stack:** Next.js 16 App Router, Firebase Admin (Firestore transactions), React 19, Tailwind v4 + daisyUI, Playwright e2e contra emuladores, Biome.

**Spec:** `docs/superpowers/specs/2026-10-28-school-plans-limits-design.md`

## Global Constraints

- Básico: `regularMonthly: 299`, `promotionalMonthly: 49`, `trialDays: 30`, `basicLimits: { teachers: 5, students: 100 }`, `currency: 'MXN'` en `NADAMAS_PRICING` (`lib/pricing.ts`). Ningún otro archivo repite estos números; los textos se arman con interpolación.
- `SUBSCRIPTION_TRIAL_MS` se deriva de `NADAMAS_PRICING.trialDays`. Las suscripciones ya creadas conservan su `trialEndsAt`.
- **Alumno** = clave única por nadador activo. Une dos fuentes:
  - Los docs `schoolStudents` con `status === 'active'`; su clave es `studentUserId || additionalProfileId || id`.
  - Las membresías activas con rol `student`; su clave es `userId`.
  - Las claves repetidas cuentan una vez.
- **Profe** = membresía activa con rol `teacher` (en `roles` o `role`) que no tenga rol `director`.
- El bloqueo es por tipo: solo se rechaza el alta de un `teacher` o `student` nuevo cuando `uso[tipo] >= límite[tipo]`. Si la persona ya está contada (su clave ya está activa), no cuenta como alta.
- Reactivar a un suspendido cuenta como alta. Durante la prueba aplican los límites del Básico.
- Exenta sin `customLimits`: sin límite. Con `customLimits`: esos límites. Cualquier otro caso, incluidas las escuelas legadas sin suscripción: Básico.
- Error de límite: `SubscriptionError('plan_limit_reached', <mensaje>, 409)`, que se responde con `subscriptionErrorResponse`. Mensajes exactos:
  - Básico: `Llegaste al límite de tu plan Básico (5 profes / 100 alumnos). Contáctanos para un plan personalizado.`
  - Personalizado: `Llegaste al límite de tu plan (${t} profes / ${s} alumnos). Contáctanos para ampliarlo.`
- Contacto = enlace a `/contacto`.
- Nunca mostrar errores crudos (`lib/user-facing-error.ts`). El mensaje de límite sí se muestra: es copy de negocio.
- Copy en español, código en inglés. Tailwind v4 shorthand (`text-(--c-x)`). Biome solo sobre archivos tocados; `pnpm typecheck` debe pasar.
- Nada de Firestore desde componentes. Las colecciones nuevas van al deny-list `isLegacyCollection` de `firestore.rules`.
- **Git:**
  - Commit en la rama actual, nunca push.
  - Hay archivos ajenos modificados sin commit; no tocarlos ni stagearlos: los 10 de formato y `app/(app)/school/create/page.tsx`, `components/school/SchoolSettings.tsx`, `e2e/onboarding.spec.ts`.
  - Excepción: Task 6 edita una línea de `create/page.tsx` y debe stagear solo su hunk. Ver la nota en Task 6.

## Review Focus

1. Dos altas simultáneas con la escuela en 99/100: exactamente una pasa. Test en Task 2.
2. Aceptar una invitación o aprobar una solicitud de alguien que ya es alumno activo no debe dar error de límite. Test en Task 3.
3. Escuela legada con 7 profes y sin doc de suscripción: sigue operando, puede agregar alumnos (si tiene menos de 100) y no puede agregar profes. Test en Task 4.
4. Volver una escuela de Personalizado a Básico: quita la exención y los límites, y si queda pasada se bloquean las altas de ese tipo. Test en Task 5.
5. Un padre con 3 hijos cuenta 3 alumnos, y un nadador con cuenta más su doc vinculado en el padrón cuenta 1. Test en Task 1.

---

### Task 1: Límites y conteo puros + precio/prueba

**Files:**
- Modify: `lib/pricing.ts` (agregar `basicLimits`, `trialDays: 30`)
- Modify: `lib/subscriptions/engine.ts:5` (`SUBSCRIPTION_TRIAL_MS = NADAMAS_PRICING.trialDays * 24 * 60 * 60 * 1000`)
- Modify: `lib/subscriptions/model.ts` (agregar a `SchoolSubscription`: `customLimits?: { teachers: number; students: number } | null`, `customPlanReason?: string`, `customPlanUpdatedAt?: number`, `customPlanUpdatedBy?: string`)
- Create: `lib/subscriptions/plans.ts`
- Test: `e2e/school-plans.spec.ts` (puro, importa de `../lib/...`)

**Interfaces:**
- Produces:
  - `type SeatKind = 'teacher' | 'student'`
  - `type SchoolPlanName = 'basic' | 'custom' | 'unlimited'`
  - `interface SchoolPlanLimits { plan: SchoolPlanName; teachers: number | null; students: number | null }`, donde `null` significa sin límite.
  - `interface SeatUsage { teachers: number; students: number }`
  - `schoolPlanLimits(sub: SchoolSubscription | null): SchoolPlanLimits`
  - `seatKeys(input: { memberships: SeatMembership[]; students: SeatStudent[] }): { teachers: Set<string>; students: Set<string> }`
    - `SeatMembership = { userId: string; status?: string; role?: string; roles?: string[] }`
    - `SeatStudent = { id: string; status?: string; studentUserId?: string; additionalProfileId?: string }`
  - `seatUsage(keys): SeatUsage`
  - `planLimitMessage(limits: SchoolPlanLimits): string`, con los mensajes exactos de Global Constraints.
  - `hasSeat(limits, usage, kind): boolean`, que devuelve `limit === null || usage[kind] < limit`.

- [ ] **Step 1: Write failing tests** in `e2e/school-plans.spec.ts`:
  - `basic limits for a missing or plain subscription`: `schoolPlanLimits(null)` → `{ plan:'basic', teachers:5, students:100 }`.
  - `exempt without custom limits is unlimited`: `{ paymentExempt:true }` → `{ plan:'unlimited', teachers:null, students:null }`.
  - `custom limits win`: `{ paymentExempt:true, customLimits:{teachers:12,students:300} }` → `{ plan:'custom', 12, 300 }`.
  - `counts each swimmer once`:
    - Entrada: un tutor con 3 docs de alumno (`id` a/b/c, sin `studentUserId`); un doc con `studentUserId:'u1'` más una membresía de alumno activa de `u1`; un doc suspendido; una membresía de alumno pendiente.
    - Esperado: `students === 4`.
  - `teachers exclude directors and inactive`:
    - Entrada: membresías `{roles:['teacher']}` ×2 activas, `{roles:['director','teacher']}` activa, `{roles:['teacher'], status:'suspended'}`.
    - Esperado: `teachers === 2`.
  - `hasSeat blocks at the limit`: `hasSeat(basic, {teachers:5, students:99}, 'teacher') === false`; `hasSeat(basic, {teachers:5, students:99}, 'student') === true`.
  - `messages`: `planLimitMessage(basic)` es igual al mensaje Básico exacto; `planLimitMessage({plan:'custom',teachers:12,students:300})` es igual a `'Llegaste al límite de tu plan (12 profes / 300 alumnos). Contáctanos para ampliarlo.'`.
  - `trial is 30 days`: `SUBSCRIPTION_TRIAL_MS === 30 * 86400000`; `newSchoolSubscription(id, owner, true, 0).trialEndsAt === 30 * 86400000`.
- [ ] **Step 2:** `pnpm test:e2e e2e/school-plans.spec.ts`. Expected: FAIL (módulo inexistente).
- [ ] **Step 3:** Implement Task 1 files.
- [ ] **Step 4:** Run the spec again. Expected: PASS. Also run `pnpm test:e2e e2e/subscriptions.spec.ts`. If it asserts 15 days, update that assertion to derive from `NADAMAS_PRICING.trialDays`.
- [ ] **Step 5:** Commit `feat(subscriptions): basic plan limits and 30-day trial`.

### Task 2: Helper de lugares en servidor

**Files:**
- Create: `lib/server/subscriptions/seats.ts`
- Modify: `firestore.rules` (agregar `'schoolSeatLocks'` al deny-list `isLegacyCollection`)
- Test: `e2e/school-plan-seats.spec.ts` (emuladores: seed por REST como `e2e/subscriptions.spec.ts`)

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `readSchoolSeats(schoolId: string, tx?: Transaction): Promise<{ limits: SchoolPlanLimits; usage: SeatUsage; keys: { teachers: Set<string>; students: Set<string> } }>`
    - Lee `schoolSubscriptions/{schoolId}`, `schoolMemberships where schoolId ==` y `schoolStudents where schoolId ==`, con `select` de solo los campos de `SeatMembership`/`SeatStudent`.
  - `reserveSchoolSeat(tx: Transaction, schoolId: string, kind: SeatKind, key: string): Promise<{ claim: () => void }>`
    - **Solo lecturas:** lee primero `schoolSeatLocks/{schoolId}` y luego llama a `readSchoolSeats(schoolId, tx)`.
    - Si `key` ya está en `keys[kind]`, devuelve `claim` sin efecto.
    - Si `!hasSeat(...)`, lanza `new SubscriptionError('plan_limit_reached', planLimitMessage(limits), 409)`.
    - Si no, `claim()` hace `tx.set(lockRef, { schoolId, updatedAt: Date.now() }, { merge: true })`.
    - El llamador hace todas sus lecturas, luego llama a `reserveSchoolSeat`, y en la fase de escrituras llama a `claim()` junto con sus `tx.set`.

- [ ] **Step 1: Failing tests:**
  - `blocks the 6th teacher`: seed de una escuela con 5 membresías teacher activas. Una transacción con `reserveSchoolSeat(tx, id, 'teacher', 'new-uid')` rechaza con `code === 'plan_limit_reached'` y status 409. La misma llamada con la clave de un teacher existente se resuelve.
  - `allows exactly one of two concurrent student seats at 99/100`: seed de 99 alumnos activos en `schoolStudents`. Lanzar con `Promise.allSettled` dos transacciones que reservan con claves distintas y escriben un doc `schoolStudents` activo más `claim()`. Esperado: un fulfilled, un rejected `plan_limit_reached`, y 100 docs activos al final.
  - `unlimited for exempt school without custom limits`: 120 alumnos y `paymentExempt:true` → `reserveSchoolSeat(..., 'student', ...)` se resuelve.

  El spec corre con `firebase-admin` contra los emuladores, importando `../lib/server/subscriptions/seats`. Si importar `server-only` falla bajo Playwright, el spec sigue el patrón que ya usan otros specs de servidor del repo, o el helper separa el núcleo puro en una función que reciba `adminDb`. Lo decide el implementador y lo anota en su reporte.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Agregar a `firestore.rules` un test de reglas: escribir y leer `schoolSeatLocks` desde el cliente se deniega. Seguir el patrón del test que se agregó para `schoolEvents`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(subscriptions): transactional seat reservation`.

### Task 3: Aplicar el límite a altas de alumnos

**Files (modify):**
- `lib/server/school-students.ts` (`createSchoolStudent` ~l.169, `getOrRestoreSchoolAgendaStudent` ~l.218)
- `lib/server/attendance.ts` (~l.568)
- `lib/server/athlete-profile-invitations.ts` (~l.138)
- `lib/server/school-invitations.ts` (student: ~l.338, ~l.483)
- `app/api/schools/[schoolId]/access-requests/route.ts` (~l.149-174)
- `app/api/schools/[schoolId]/class-requests/route.ts` (~l.142)
- `app/api/coach/agenda/bookings/route.ts` (~l.265)
- `app/api/coach/students/route.ts` (~l.445)
- Cualquier endpoint que cambie un alumno o membresía de alumno de `suspended`/`pending` a `active`.
  - Buscar con `grep -rn "status: 'active'" lib/server app/api`, y buscar también los PATCH de estado de alumno y miembro.
  - Listar en el reporte cada sitio y la decisión tomada.
- Test: `e2e/school-plan-seats.spec.ts` (extender)

**Interfaces:** Consumes `reserveSchoolSeat` (Task 2). La clave del alumno es `studentUserId || additionalProfileId || docId`, o el `uid` del miembro.

- [ ] **Step 1: Failing tests (HTTP, emuladores):**
  - `createSchoolStudent at 100 returns plan_limit_reached`: escuela con 100 alumnos activos; `POST` al endpoint de alta de alumno del director → 409, `code: 'plan_limit_reached'`, y el mensaje Básico exacto. No se crea ningún doc.
  - `approving an access request for an already-active student is not blocked`: escuela en 100/100 donde el solicitante ya es alumno activo → aprobar responde 2xx.
  - `reactivating a suspended student at 100/100 is blocked`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Wire `reserveSchoolSeat` + `claim()` en cada sitio, dentro de la transacción que ya existe. Si un sitio escribe fuera de una transacción, envolverlo en una. Cada ruta mapea el error con `subscriptionErrorResponse`.
- [ ] **Step 4:** Run the new spec, `e2e/school-access-requests.spec.ts`, `e2e/subscriptions.spec.ts`, `e2e/payments.spec.ts` y `e2e/additional-profiles.spec.ts`. Expected: PASS (fuera de los fallos ya conocidos de antes).
- [ ] **Step 5:** Commit `feat(subscriptions): enforce student limit on every enrollment path`.

### Task 4: Aplicar el límite a altas de profes

**Files (modify):**
- `lib/server/school-invitations.ts`: aceptar una invitación con rol `teacher`, ~l.486 y l.541.
- Cualquier endpoint que agregue el rol `teacher` a una membresía o reactive a un profe.
  - Buscar con `grep -rn "'teacher'" lib/server app/api`.
  - La creación de la escuela (`lib/server/schools.ts:331`, director) no se toca.
- Test: `e2e/school-plan-seats.spec.ts` (extender)

**Interfaces:** Consumes `reserveSchoolSeat(tx, schoolId, 'teacher', uid)`.

- [ ] **Step 1: Failing tests:**
  - `accepting a 6th teacher invitation is blocked`: escuela con 5 profes; aceptar la invitación de profe → 409 `plan_limit_reached`, y la invitación sigue pendiente.
  - `legacy school over the teacher limit still adds students`: escuela sin doc de suscripción, 7 profes y 10 alumnos. Crear alumno → 2xx; aceptar una invitación de profe → 409.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS) along with `e2e/tenant-workspace.spec.ts` y `e2e/school-workspace.spec.ts`.
- [ ] **Step 5:** Commit `feat(subscriptions): enforce teacher limit`.

### Task 5: Plan Personalizado en admin

**Files:**
- Modify: `lib/server/subscriptions/store.ts` (nuevo `setSchoolCustomPlan`)
- Modify: `app/api/subscriptions/admin/route.ts` (acción `setCustomPlan`)
- Modify: `components/subscriptions/AdminSubscriptions.tsx`
- Test: `e2e/school-plan-seats.spec.ts` (extender, vía HTTP con admin de emulador como en `e2e/subscriptions.spec.ts`)

**Interfaces:**
- Produces: `setSchoolCustomPlan(schoolId: string, limits: { teachers: number; students: number } | null, reason: string, actorId: string): Promise<void>`.
  - Con `limits`:
    - Valida enteros con `teachers > 5`, `students > 100` y ambos `<= 100000`. Si no, lanza `SubscriptionError('invalid_limits', 'Revisa los límites del plan personalizado.', 400)`.
    - Llama a `setSchoolPaymentExemption(schoolId, true, reason, actorId)` y después guarda en una transacción `customLimits`, `customPlanReason`, `customPlanUpdatedAt` y `customPlanUpdatedBy`.
  - Con `null`: solo si la escuela tiene `customLimits`, quita los límites y llama a `setSchoolPaymentExemption(schoolId, false, reason, actorId)`.
  - En ambos casos escribe una entrada en `subscriptionAudit` con el mismo formato que la exención.
- Body de admin: `{ action: 'setCustomPlan', schoolId, limits: {teachers, students} | null, reason }`.
- UI: por escuela, sección "Plan" con dos estados.
  - **Básico:** botón "Pasar a Personalizado", que abre un formulario con "Profes", "Alumnos" y "Nota" y el botón "Guardar plan".
  - **Personalizado:** muestra "Personalizado · N profes · M alumnos" con los botones "Editar" y "Volver a Básico".
  - Errores con `GENERIC_USER_ERROR`, salvo el mensaje de `invalid_limits`.

- [ ] **Step 1: Failing tests:**
  - `admin sets custom limits and the 6th teacher passes`: con `limits {teachers:8, students:150}` la suscripción queda con `paymentExempt: true` y `customLimits`, y aceptar la 6.ª invitación de profe responde 2xx.
  - `invalid limits rejected`: `{teachers:5, students:100}` → 400 `invalid_limits`.
  - `back to basic clears exemption and limits`: tras volver a Básico con 8 profes, `paymentExempt` queda falso, `customLimits` vacío, y aceptar otra invitación de profe → 409.
  - `non-admin cannot set custom plan`: el director recibe 403.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS) along with `e2e/subscriptions.spec.ts`.
- [ ] **Step 5:** Commit `feat(subscriptions): admin custom plan with own limits`.

### Task 6: Uso, avisos de límite y textos

**Files:**
- Modify: `lib/subscriptions/model.ts` (`SubscriptionSnapshot.plan: { limits: SchoolPlanLimits; usage: SeatUsage }`)
- Modify: `app/api/subscriptions/route.ts` GET (rellenar `plan` con `readSchoolSeats`)
- Create: `components/subscriptions/PlanLimitNotice.tsx`
  - `PlanLimitNotice({ message }: { message: string })`: texto más el enlace "Contáctanos" a `/contacto`, con `role="alert"`.
  - `planLimitMessageOf(error: unknown): string | null`: devuelve `error.message` cuando `error instanceof AuthedApiError && error.code === 'plan_limit_reached'`.
- Modify: `components/subscriptions/SchoolSubscription.tsx`
  - Muestra `Plan Básico · 3 de 5 profes · 64 de 100 alumnos`, o `Plan Personalizado · …`, o `Sin límite`.
  - Quitar "Una suscripción incluye a todos sus profesores."
- Modify: `components/subscriptions/SchoolSubscriptionBanner.tsx`
  - Si `usage[tipo] > limit[tipo]` en cualquier tipo, aviso persistente: `Tu escuela supera los límites del plan Básico. Contáctanos para un plan personalizado.`, con enlace a `/contacto`.
  - Para plan custom: `Tu escuela supera los límites de su plan. Contáctanos para ampliarlo.`
- Modify: las UIs de alta donde se muestran los errores: invitar profe, alta de alumno, aprobar solicitud, aceptar invitación (`components/school/SchoolInvitationPage.tsx`), reservas del coach (`components/coach/CoachAgenda.tsx`). Cuando `planLimitMessageOf(error)` no es nulo, mostrar `PlanLimitNotice` en lugar del error genérico.
- Copy (todo interpolado de `NADAMAS_PRICING`):
  - `app/(marketing)/precio/page.tsx`: metadata, una tarjeta Básico (precio, `Hasta 5 profes y 100 alumnos`, `Prueba de 30 días sin tarjeta para tu primera escuela.`) y una tarjeta Personalizado (`Más de 5 profes o 100 alumnos`, `Precio a la medida`, botón `Contáctanos` → `/contacto`). Quitar "todos sus profesores".
  - `components/marketing/pricing-teaser.tsx`, `components/marketing/faq.tsx`, `app/llms.txt/route.ts`, `app/(marketing)/page.tsx:122` (JSON-LD `offers.description`), `components/subscriptions/AdminSubscriptions.tsx:97`, `components/onboarding/setup-paths.ts:102`.
  - Reemplazar "todos sus/tus profesores incluidos" por "hasta 5 profes y 100 alumnos" y "15 días" por `${trialDays} días`.
  - `app/(app)/school/create/page.tsx` ya lee `trialDays`, así que no se toca salvo el texto "$299 … todos sus profesores incluidos" de la rama `ownedSchool`.
  - Ese archivo tiene cambios ajenos sin commit. Stagear solo el hunk propio con `git show HEAD:<file>`, editar esa copia, `git hash-object -w` y `git update-index --cacheinfo`.
- Test: `e2e/school-plans-ui.spec.ts`
  - `/precio` muestra "Hasta 5 profes y 100 alumnos", "Prueba de 30 días" y un enlace "Contáctanos" a `/contacto`, y no muestra "todos sus profesores".
  - Director de una escuela en 100/100 intenta dar de alta un alumno: ve el mensaje Básico exacto y un enlace a `/contacto`.
  - La pantalla de Suscripción muestra `2 de 5 profes`.
  - `grep -rn "todos sus profesores\|todos tus profesores\|15 días" app components lib` sin resultados en copy de producto. Lo corre el implementador; no es parte del spec.

- [ ] **Step 1:** Write failing UI spec. **Step 2:** Run (FAIL). **Step 3:** Implement. **Step 4:** Run the UI spec, `e2e/subscriptions.spec.ts`, `e2e/onboarding.spec.ts`, `e2e/smoke.spec.ts` (PASS) y verificar a 390px de ancho que no haya scroll horizontal en `/precio`.
- [ ] **Step 5:** Commit `feat(subscriptions): plan usage, limit notices and pricing copy`.
