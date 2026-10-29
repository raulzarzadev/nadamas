import { type APIRequestContext, expect, type Page, test } from '@playwright/test'
import { addDays, format } from 'date-fns'

const SHOTS =
  '/private/tmp/claude-501/-Users-zarza-Documents-projects-nadamas/cac27305-4eea-4c23-ae5d-b01232a15e92/scratchpad/flow-agents/shots'
const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
const authBase = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const dayLabel = (date: Date) => DAYS[(date.getDay() + 6) % 7]

const suffix = crypto.randomUUID().slice(0, 8)
const athleteEmail = `swimmer-${suffix}@test.com`
const readyEmail = `ready-${suffix}@test.com`
let readyId = ''
const independentName = `Profe Indep ${suffix}`
const schoolName = `Escuela Pública ${suffix}`
const schoolCoachName = `Profe Escuela ${suffix}`
const planTitle = `Plan público ${suffix}`
const schoolId = `athsearch-${suffix}`
const tenantUrl = `http://${schoolId}.localhost:3000`
const documents: string[] = []

function encode(value: unknown): unknown {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, encode(v)])
      ),
    },
  }
}
async function seed(path: string, value: Record<string, unknown>) {
  documents.push(path)
  const response = await fetch(`${root}/${path}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])),
    }),
  })
  expect(response.ok, await response.clone().text()).toBe(true)
}
async function signup(email: string) {
  const response = await fetch(`${authBase}/accounts:signUp?key=local-test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'local-test-password', returnSecureToken: true }),
  })
  expect(response.ok).toBe(true)
  return (await response.json()) as { localId: string; idToken: string }
}
async function loginLink(request: APIRequestContext, email: string) {
  expect((await request.post('/api/auth/otp/request', { data: { email } })).ok()).toBe(true)
  const otp = await (
    await fetch(`${root}/otpLoginCodes/${email}`, { headers: { authorization: 'Bearer owner' } })
  ).json()
  return `/auth/link?email=${encodeURIComponent(email)}&token=${otp.fields.devLinkToken.stringValue}`
}
async function loginAs(page: Page, request: APIRequestContext, email: string) {
  await page.goto(await loginLink(request, email))
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.waitForURL(/\/(athlete|welcome|dashboard)/)
}
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${SHOTS}/athlete-search-${name}.png`, fullPage: false })

function offering(id: string, place: string, groupType: 'particular' | 'grupal', dates: string[]) {
  return {
    id,
    mode: 'fixed',
    placeName: place,
    groupType,
    maxPeople: groupType === 'grupal' ? 6 : null,
    priceCents: 25000,
    currency: 'MXN',
    unit: 'clase',
    schedules: [
      {
        id: `${id}-s`,
        timeMode: 'fixed',
        days: [...new Set(dates.map((d) => dayLabel(new Date(`${d}T12:00:00`))))],
        startTime: groupType === 'grupal' ? '19:00' : '17:30',
        endTime: groupType === 'grupal' ? '20:00' : '18:30',
        availabilityMode: 'dates',
        availableDates: dates,
      },
    ],
  }
}

let independentId = ''
let schoolCoachId = ''
let planId = ''
const dates = [2, 3, 4].map((n) => format(addDays(new Date(), n), 'yyyy-MM-dd'))

test.use({ viewport: { width: 390, height: 844 } })

test.beforeAll(async () => {
  const independent = await signup(`indep-${suffix}@test.com`)
  independentId = independent.localId
  await seed(`users/${independentId}`, {
    email: `indep-${suffix}@test.com`,
    nickname: independentName,
    firstName: 'Indep',
    roles: { athlete: true, coach: true, admin: false },
    onboarding: { completed: true },
  })
  await seed(`coaches/${independentId}`, {
    bio: 'Coach independiente de prueba',
    publicProfileVisible: true,
    createdAt: Date.now(),
    classOfferings: [
      offering(`off-p-${suffix}`, 'Alberca Central', 'particular', dates),
      offering(`off-g-${suffix}`, 'Alberca Grupal', 'grupal', dates),
    ],
  })
  const schoolCoach = await signup(`schoolcoach-${suffix}@test.com`)
  schoolCoachId = schoolCoach.localId
  await seed(`users/${schoolCoachId}`, {
    email: `schoolcoach-${suffix}@test.com`,
    nickname: schoolCoachName,
    roles: { athlete: true, coach: true, admin: false },
    onboarding: { completed: true },
  })
  await seed(`schools/${schoolId}`, {
    id: schoolId,
    name: schoolName,
    slug: schoolId,
    description: 'Escuela pública de natación para pruebas de búsqueda de atletas',
    directorId: schoolCoachId,
    ownerId: schoolCoachId,
    createdBy: schoolCoachId,
    timezone: 'America/Mexico_City',
    isPublic: true,
    bookingMode: 'direct',
    showCoachesSchedules: true,
  })
  await seed(`schoolSlugs/${schoolId}`, { schoolId })
  await seed(`schoolMemberships/${schoolId}_${schoolCoachId}`, {
    schoolId,
    userId: schoolCoachId,
    role: 'director',
    roles: ['director', 'teacher'],
    status: 'active',
  })
  await seed(`schoolCoachOfferings/${schoolId}_${schoolCoachId}`, {
    schoolId,
    coachId: schoolCoachId,
    updatedAt: Date.now(),
    classOfferings: [offering(`off-s-${suffix}`, 'Alberca Escuela', 'particular', dates)],
  })
  planId = `plan-${suffix}`
  const start = format(addDays(new Date(), -2), 'yyyy-MM-dd')
  const end = format(addDays(new Date(), 30), 'yyyy-MM-dd')
  await seed(`trainingPlans/${planId}`, {
    userId: independentId,
    createdAt: Date.now(),
    visibility: 'public',
    cycles: [
      {
        id: 'macro-1',
        parentId: null,
        type: 'macro',
        title: planTitle,
        startDate: start,
        endDate: end,
        goal: 'Mejorar resistencia',
        sessionWeekdays: [1, 3],
        content: 'Plan base',
      },
    ],
    summary: {
      title: planTitle,
      goal: 'Mejorar resistencia',
      content: 'Plan base',
      startDate: start,
      endDate: end,
      sessionWeekdays: [1, 3],
      authorName: independentName,
      authorPhoto: '',
      authorRole: 'coach',
    },
  })
})

test.beforeAll(async () => {
  const ready = await signup(readyEmail)
  readyId = ready.localId
  await seed(`users/${readyId}`, {
    email: readyEmail,
    nickname: 'Nadia Nadadora',
    roles: { athlete: true, coach: false, admin: false },
    onboarding: { version: 1, completedAt: Date.now(), interests: ['swimmer'], coachContext: null },
  })
})

const tenantEmail = `tenant-${suffix}@test.com`
const schoolPlanTitle = `Plan escuela ${suffix}`
test.beforeAll(async () => {
  const tenantAthlete = await signup(tenantEmail)
  await seed(`users/${tenantAthlete.localId}`, {
    email: tenantEmail,
    nickname: 'Tomas Tenant',
    roles: { athlete: true, coach: false, admin: false },
    onboarding: { version: 1, completedAt: Date.now(), interests: ['swimmer'], coachContext: null },
  })
  await seed(`schoolMemberships/${schoolId}_${tenantAthlete.localId}`, {
    schoolId,
    userId: tenantAthlete.localId,
    role: 'student',
    roles: ['student'],
    status: 'active',
  })
  await seed(`schoolStudents/tenant-student-${suffix}`, {
    schoolId,
    name: 'Tomas Tenant',
    birthDate: '2000-01-01',
    gender: 'male',
    studentUserId: tenantAthlete.localId,
    accountParticipant: true,
    guardianIds: [],
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
    guardianEmail: '',
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  const start = format(addDays(new Date(), -1), 'yyyy-MM-dd')
  const end = format(addDays(new Date(), 20), 'yyyy-MM-dd')
  await seed(`trainingPlans/schoolplan-${suffix}`, {
    userId: schoolCoachId,
    createdAt: Date.now(),
    visibility: 'public',
    cycles: [
      { id: 'macro-s', parentId: null, type: 'macro', title: schoolPlanTitle, startDate: start, endDate: end, goal: 'Técnica', sessionWeekdays: [2], content: '' },
    ],
    summary: { title: schoolPlanTitle, goal: 'Técnica', content: '', startDate: start, endDate: end, sessionWeekdays: [2], authorName: schoolCoachName, authorPhoto: '', authorRole: 'coach' },
  })
})

async function deleteWhere(collection: string, field: string, value: string) {
  const response = await fetch(`${root.replace('/documents', '')}/documents:runQuery`, {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
      },
    }),
  })
  const rows = (await response.json()) as { document?: { name: string } }[]
  await Promise.all(
    rows
      .filter((row) => row.document)
      .map((row) =>
        fetch(`http://127.0.0.1:8080/v1/${row.document?.name}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer owner' },
        })
      )
  )
}

test.afterAll(async () => {
  await Promise.all(
    documents.map((doc) =>
      fetch(`${root}/${doc}`, { method: 'DELETE', headers: { authorization: 'Bearer owner' } })
    )
  )
  for (const [collection, field, value] of [
    ['bookings', 'athleteId', readyId],
    ['bookings', 'schoolId', schoolId],
    ['schoolClassOccurrences', 'schoolId', schoolId],
    ['schoolClassRequests', 'schoolId', schoolId],
    ['schoolAccessRequests', 'schoolId', schoolId],
    ['trainingPlanSubscriptions', 'planId', planId],
  ])
    await deleteWhere(collection, field, value).catch(() => {})
})

test('1. registro como nadador: onboarding -> home atleta', async ({ page, request }) => {
  test.setTimeout(90000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, athleteEmail)
  await shot(page, '01-after-login')
  console.log('URL after login', page.url())
  await expect(page.getByRole('heading', { name: 'Vamos a configurar tu perfil.' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Soy nadador', exact: true }).check()
  await page.getByRole('button', { name: 'Ver mis primeros pasos' }).click()
  await expect(page.getByRole('heading', { name: /Todo listo para empezar/ })).toBeVisible()
  await shot(page, '02-welcome-step2')
  console.log(await page.locator('main').innerText())
  const links = await page.locator('main a, main button').allInnerTexts()
  console.log('LINKS', links)
})

test('2. home + tab bar + credencial', async ({ page, request }) => {
  test.setTimeout(90000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  await page.goto('/athlete/home')
  await expect(page.getByRole('heading', { name: /Hola/ })).toBeVisible()
  const box = await page.getByRole('heading', { name: /Hola/ }).boundingBox()
  console.log('h1 box', box)
  console.log('searchbtn box', await page.getByRole('button', { name: 'Buscar entrenador o escuela' }).boundingBox())
  await expect(page.getByText('Reserva tu primera clase')).toBeVisible()
  // tab bar
  const tab = page.getByRole('navigation').filter({ hasText: 'Credencial' })
  await expect(tab).toBeVisible()
  const cred = page.getByRole('button', { name: /Credencial/ })
  console.log('cred count', await cred.count())
  await cred.first().click()
  await page.waitForTimeout(1500)
  await shot(page, '05-credencial')
  console.log('dialogs', await page.getByRole('dialog').allInnerTexts())
})

async function openSearch(page: Page) {
  await page.goto('/athlete/home')
  await expect(page.getByRole('heading', { name: /Hola, Nadia/ })).toBeVisible()
  await page.getByRole('button', { name: 'Buscar entrenador o escuela' }).click()
  return page.getByRole('dialog')
}

async function openHorariosSheet(page: Page) {
  await page.goto('/athlete/schedule')
  await page.getByRole('button', { name: 'Buscar más horarios' }).click()
  const dlg = page.getByRole('dialog')
  await expect(dlg.getByText('Sábado').first()).toBeVisible({ timeout: 30000 })
  return dlg
}

test('3. horarios vacio + reservar clase particular', async ({ page, request }) => {
  test.setTimeout(120000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  await page.goto('/athlete/home')
  await page.getByRole('link', { name: 'Horarios', exact: true }).locator('visible=true').first().click()
  await page.waitForURL('**/athlete/schedule')
  await expect(page.getByText('Aún no tienes clases próximas.')).toBeVisible()
  await shot(page, '06-horarios-empty')
  await page.getByRole('button', { name: 'Buscar más horarios' }).click()
  const dlg = page.getByRole('dialog')
  await expect(dlg.getByText('Sábado').first()).toBeVisible({ timeout: 30000 })
  for (const label of ['Escuelas', 'Profes', 'Entrenos', 'Horarios']) await expect(dlg.getByRole('checkbox', { name: label })).toBeAttached()
  await expect(dlg.getByRole('checkbox', { name: 'Horarios' })).toBeChecked()
  await dlg.getByRole('button', { name: new RegExp(`17:30 · ${independentName} · particular`) }).first().click()
  await dlg.getByRole('button', { name: 'Continuar', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Reservar horario' })
  await expect(sheet).toBeVisible()
  const t0 = Date.now()
  await sheet.getByRole('button', { name: 'Reservar', exact: true }).click()
  await expect(page.getByText('La clase se agendó con éxito.').first()).toBeVisible({ timeout: 40000 })
  console.log('BOOK_LATENCY_MS', Date.now() - t0)
  await page.getByRole('button', { name: 'Entendido', exact: true }).click()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await shot(page, '11-after-book-close')
  await page.goto('/athlete/schedule')
  await page.waitForTimeout(2500)
  await shot(page, '12-horarios-upcoming')
  console.log('MAIN:', await page.locator('main').innerText())
  await expect(page.getByText(independentName).first()).toBeVisible()
})

test('4. horarios: reservar clase grupal', async ({ page, request }) => {
  test.setTimeout(120000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  const dlg = await openHorariosSheet(page)
  await dlg.getByRole('button', { name: new RegExp(`19:00 · ${independentName} · grupal`) }).first().click()
  await dlg.getByRole('button', { name: 'Continuar', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Reservar horario' })
  await expect(sheet).toBeVisible()
  await shot(page, '13-group-sheet')
  console.log('GROUP SHEET', await sheet.innerText())
  await sheet.getByRole('button', { name: 'Reservar', exact: true }).click()
  await expect(page.getByText('La clase se agendó con éxito.').first()).toBeVisible({ timeout: 40000 })
  await page.getByRole('button', { name: 'Entendido', exact: true }).click()
  await page.goto('/athlete/schedule')
  await expect(page.getByText('Grupal', { exact: true }).first()).toBeVisible()
  await shot(page, '14-two-classes')
  console.log('MAIN:', await page.locator('main').innerText())
})

test('5. sheet: Escuelas / Profes / Entrenos', async ({ page, request }) => {
  test.setTimeout(120000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  const dlg = await openSearch(page)
  await expect(dlg.getByRole('checkbox', { name: 'Profes' })).toBeAttached()
  await page.waitForTimeout(4000)
  await shot(page, '15-search-default')
  console.log('DEFAULT:', await dlg.innerText())
  console.log('CHECKED', await dlg.getByRole('checkbox').evaluateAll((els) => els.map((e) => `${e.parentElement?.textContent}:${(e as HTMLInputElement).checked}`)))
})

test('6. buscar profe por nombre -> horarios del profe -> detalle del horario', async ({ page, request }) => {
  test.setTimeout(150000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  const dlg = await openSearch(page)
  await dlg.getByRole('searchbox').fill(independentName)
  await dlg.getByRole('link', { name: new RegExp(`: ${independentName}$`) }).click()
  await page.waitForURL('**/athlete/search/coach/**')
  await expect(page.getByRole('button', { name: new RegExp(`17:30 · ${independentName} · particular`) }).first()).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: new RegExp(`2026.*17:30 · ${independentName} · particular`) }).nth(1).click()
  await page.getByRole('button', { name: /Ver 1 horario/ }).click()
  await page.waitForTimeout(1000)
  await shot(page, '17b-slot-details')
  for (const d of await page.getByRole('dialog').all()) console.log('DETAILS>>', await d.innerText())
  await page.getByLabel('Horarios seleccionados').getByRole('button', { name: 'Continuar', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Reservar horario' })
  await expect(sheet).toBeVisible()
  const text = await sheet.innerText()
  console.log('BOOK SHEET>>', text)
  expect.soft(text, 'friccion: el precio no se ve al reservar').toMatch(/\$\s?250|250/)
  expect.soft(text, 'friccion: el lugar no se ve al reservar').toContain('Alberca Central')
})

test('7. escuela publica: buscar -> ver escuela -> horarios', async ({ page, request }) => {
  test.setTimeout(150000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  const dlg = await openSearch(page)
  await dlg.getByRole('searchbox').fill(schoolName)
  await dlg.getByRole('link', { name: `Ver escuela: ${schoolName}` }).click()
  await page.waitForURL(`**/athlete/search/school/${schoolId}`)
  await page.waitForTimeout(4000)
  await shot(page, '18-school-page')
  await page.getByRole('link', { name: 'Explorar horarios de la escuela' }).click()
  await page.waitForURL('**/schedule')
  await page.waitForTimeout(5000)
  await shot(page, '19-school-schedule')
  await page.getByRole('button', { name: new RegExp(`17:30 · ${schoolCoachName} · particular`) }).first().click()
  await page.waitForTimeout(2500)
  await shot(page, '20-school-chip-click')
  console.log('AFTER CHIP>>', await page.locator('body').innerText())
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Reservar horario' })
  await expect(sheet).toBeVisible()
  await page.waitForTimeout(2500)
  await shot(page, '20-school-book-sheet')
  console.log('SCHOOL BOOK SHEET>>', await sheet.innerText())
  await sheet.getByRole('button', { name: /^Reservar$|Solicitar/ }).click()
  await expect(sheet.getByRole('button', { name: 'Enviando…' })).toHaveCount(0, { timeout: 60000 })
  await shot(page, '21-school-booked')
  expect
    .soft(
      await sheet.getByText('No tienes acceso para solicitar estos horarios').count(),
      'bug: escuela publica en modo directo rechaza la primera reserva de un no-miembro con un 403 generico'
    )
    .toBe(0)
})

test('8. escuela publica: solicitar unirme', async ({ page, request }) => {
  test.setTimeout(120000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  await page.goto(`/athlete/search/school/${schoolId}`)
  await expect(page.getByRole('button', { name: 'Solicitar unirme al equipo' })).toBeVisible()
  await page.waitForTimeout(2000)
  const responsePromise = page.waitForResponse((r) => r.url().includes('/access-requests') && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null)
  await page.getByRole('button', { name: 'Solicitar unirme al equipo' }).click()
  const resp = await responsePromise
  console.log('JOIN RESP', resp?.status(), resp ? await resp.text() : 'none')
  await page.waitForTimeout(2000)
  await shot(page, '22-join-request')
  console.log('URL', page.url())
  console.log('BODY:', await page.locator('main').innerText())
  for (const d of await page.getByRole('dialog').all()) console.log('DLG>>', await d.innerText())
})

test('9. entrenos: estado vacio -> buscar plan publico -> suscribirme', async ({ page, request }) => {
  test.setTimeout(150000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  await page.goto('/athlete/home')
  await expect(page.getByRole('heading', { name: /Hola, Nadia/ })).toBeVisible()
  await page.getByRole('link', { name: 'Entrenos', exact: true }).locator('visible=true').first().click()
  await page.waitForURL('**/athlete/training')
  await expect(page.getByText('No tienes entrenos aún')).toBeVisible()
  await shot(page, '23-entrenos-empty')
  console.log('EMPTY:', await page.locator('main').innerText())
  await page.getByRole('button', { name: /Buscar entrenos/ }).first().click()
  const dlg = page.getByRole('dialog')
  await expect(dlg.getByRole('searchbox')).toBeVisible()
  await dlg.getByRole('searchbox').fill(planTitle)
  await page.waitForTimeout(2500)
  await shot(page, '24-entrenos-search')
  console.log('SEARCH:', await dlg.innerText())
  console.log('CHECKED', await dlg.getByRole('checkbox').evaluateAll((els) => els.map((e) => `${e.parentElement?.textContent}:${(e as HTMLInputElement).checked}`)))
  await dlg.getByRole('link', { name: new RegExp(planTitle) }).click()
  await page.waitForURL(`**/athlete/training/plans/${planId}`)
  await page.waitForTimeout(3500)
  await shot(page, '25-plan-preview')
  await page.getByRole('button', { name: 'Suscribirme', exact: true }).click()
  await page.waitForTimeout(4000)
  await shot(page, '26-subscribed')
  console.log('AFTER SUB:', await page.locator('main').innerText())
  console.log('URL', page.url())
  await page.goto('/athlete/training')
  await expect(page.getByRole('button', { name: `Suscrito: ${planTitle}`, exact: true })).toBeVisible()
  await shot(page, '27-entrenos-subscribed')
  console.log('ENTRENOS:', await page.locator('main').innerText())
})

test('10. subdominio de escuela: la busqueda solo muestra profes y entrenos de esa escuela', async ({ page, request }) => {
  test.setTimeout(180000)
  page.setDefaultTimeout(40000)
  await page.goto(tenantUrl + (await loginLink(request, tenantEmail)))
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.waitForURL(/\/athlete|\/welcome|\/dashboard/)
  await page.goto(`${tenantUrl}/athlete/home`)
  await expect(page.getByRole('heading', { name: /Hola/ })).toBeVisible()
  await shot(page, '28-tenant-home')
  console.log('TENANT HOME:', await page.locator('main').innerText())
  await page.getByRole('button', { name: /Buscar entrenador o entreno/ }).click()
  const dlg = page.getByRole('dialog')
  await expect(dlg.getByRole('searchbox')).toBeVisible()
  await page.waitForTimeout(5000)
  await shot(page, '29-tenant-search')
  console.log('TENANT SEARCH:', await dlg.innerText())
  await expect(dlg.getByRole('checkbox', { name: 'Escuelas' })).toHaveCount(0)
  await expect(dlg.getByText(independentName)).toHaveCount(0)
  await expect(dlg.getByText(planTitle)).toHaveCount(0)
  await expect(dlg.getByText(schoolCoachName).first()).toBeVisible()
  await expect(dlg.getByText(schoolPlanTitle)).toBeVisible()
})

test('11. subdominio: miembro reserva horario de la escuela', async ({ page, request }) => {
  test.setTimeout(180000)
  page.setDefaultTimeout(40000)
  await page.goto(tenantUrl + (await loginLink(request, tenantEmail)))
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.waitForURL(/\/athlete|\/welcome|\/dashboard/)
  await page.goto(`${tenantUrl}/athlete/schedule`)
  await expect(page.getByRole('button', { name: 'Buscar más horarios' })).toBeVisible()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: 'Buscar más horarios' }).click()
  const dlg = page.getByRole('dialog')
  const chip = dlg.getByRole('button', { name: new RegExp(`17:30 · ${schoolCoachName} · particular`) }).first()
  await expect(chip).toBeVisible({ timeout: 40000 })
  await shot(page, '30-tenant-horarios')
  console.log('TENANT HORARIOS:', (await dlg.innerText()).slice(0, 600))
  await expect(dlg.getByRole('checkbox', { name: 'Escuelas' })).toHaveCount(0)
  await chip.click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: /Reservar horario/ })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: /^Reservar$|Solicitar/ }).click()
  const t0 = Date.now()
  await expect(sheet.getByRole('button', { name: 'Enviando…' })).toHaveCount(0, { timeout: 60000 })
  console.log('SCHOOL BOOK MS', Date.now() - t0)
  await page.waitForTimeout(1000)
  await shot(page, '31-tenant-booked')
  for (const d of await page.getByRole('dialog').all()) console.log('AFTER>>', (await d.innerText()).slice(0, 500))
})

test('12. home: CTA reserva tu primera clase, buscar coaches y margenes en movil', async ({ page, request }) => {
  test.setTimeout(150000)
  page.setDefaultTimeout(40000)
  await loginAs(page, request, readyEmail)
  await page.goto('/athlete/home')
  await expect(page.getByRole('heading', { name: /Hola, Nadia/ })).toBeVisible()
  const h1 = await page.getByRole('heading', { name: /Hola, Nadia/ }).boundingBox()
  expect.soft(h1?.x ?? 0, 'friccion: el titulo de Inicio pega al borde izquierdo en 390px').toBeGreaterThanOrEqual(12)
  await page.getByRole('link', { name: /Buscar coaches/ }).click()
  await page.waitForURL('**/athlete/search-coaches')
  await page.waitForTimeout(3000)
  await shot(page, '32-search-coaches')
  console.log('SEARCH-COACHES:', (await page.locator('main').innerText()).slice(0, 400))
  await page.goto('/athlete/home')
  await expect(page.getByText('Tu próxima clase', { exact: true })).toBeVisible()
  await shot(page, '33-home-with-class')
  console.log('HOME w/ booking:', (await page.locator('main').innerText()).slice(0, 300))
})

test('13. desktop: home, horarios y buscador', async ({ page, request }) => {
  test.setTimeout(150000)
  page.setDefaultTimeout(40000)
  await page.setViewportSize({ width: 1280, height: 900 })
  await loginAs(page, request, readyEmail)
  await page.goto('/athlete/home')
  await expect(page.getByRole('heading', { name: /Hola, Nadia/ })).toBeVisible()
  await shot(page, '34-desktop-home')
  await page.goto('/athlete/schedule')
  await expect(page.getByRole('button', { name: 'Buscar más horarios' })).toBeVisible()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: 'Buscar más horarios' }).click()
  await expect(page.getByRole('dialog').getByText('Sábado').first()).toBeVisible({ timeout: 30000 })
  await shot(page, '35-desktop-horarios-sheet')
})
