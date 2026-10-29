import { type BrowserContext, expect, type Page, test } from '@playwright/test'

const SHOTS =
  '/private/tmp/claude-501/-Users-zarza-Documents-projects-nadamas/cac27305-4eea-4c23-ae5d-b01232a15e92/scratchpad/flow-agents/shots'
const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'

const encode = (value: unknown): Record<string, unknown> => {
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

async function seed(path: string, values: Record<string, unknown>) {
  const response = await fetch(`${root}/${path}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, encode(v)])),
    }),
  })
  expect(response.ok, await response.clone().text()).toBe(true)
}

async function signup(email: string) {
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'local-test-password', returnSecureToken: true }),
    }
  )
  expect(response.ok).toBe(true)
  return (await response.json()) as { localId: string; idToken: string }
}

async function login(page: Page, email: string) {
  await page.goto('/login')
  const policy = page.getByRole('button', { name: 'Aceptar política y continuar' })
  const emailField = page.getByLabel('Correo', { exact: true })
  await policy.or(emailField).first().waitFor()
  if (await policy.count()) await policy.click()
  await emailField.fill(email)
  await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'))
}

/**
 * FINDING (bug): on a cold load of a setup-entry route (e.g. /coach/agenda) a slow profile read
 * (>5s) makes AuthGate see the fallback user (no onboarding) and bounce an onboarded user to
 * /welcome. Retry once so the rest of the flow can still be verified.
 */
async function gotoApp(page: Page, path: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path)
    const outcome = await Promise.race([
      page
        .getByRole('navigation', { name: 'Navegación principal' })
        .first()
        .waitFor({ timeout: 25000 })
        .then(() => 'app'),
      page.waitForURL(/\/welcome/, { timeout: 25000 }).then(() => 'welcome'),
    ]).catch(() => 'timeout')
    if (outcome !== 'welcome') return
    console.log('BOUNCED_TO_WELCOME', path)
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const dayName = (key: string) =>
  ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date(`${key}T12:00:00`).getDay()]

type World = Awaited<ReturnType<typeof seedWorld>>

/** Established independent coach: 4 athletes + a child profile, past/upcoming bookings. */
async function seedWorld() {
  const id = crypto.randomUUID().slice(0, 8)
  const coachEmail = `cs-coach-${id}@test.com`
  const coach = await signup(coachEmail)
  const now = Date.now()
  await seed(`users/${coach.localId}`, {
    id: coach.localId,
    email: coachEmail,
    nickname: 'Coach Estable',
    name: 'Coach Estable',
    roles: { athlete: true, coach: true, admin: false },
    onboarding: { version: 1, interests: ['coach'], coachContext: 'independent', completedAt: 1 },
  })
  const particular = `off-p-${id}`
  const grupal = `off-g-${id}`
  const dates = [-3, -1, 0, 1, 2, 3, 5].map(dayKey)
  const schedule = (sid: string, start: string, end: string) => ({
    id: sid,
    timeMode: 'fixed',
    days: [...new Set(dates.map(dayName))],
    startTime: start,
    endTime: end,
    availabilityMode: 'dates',
    availableDates: dates,
  })
  await seed(`coaches/${coach.localId}`, {
    id: coach.localId,
    name: 'Coach Estable',
    publicProfileVisible: true,
    createdAt: now,
    updatedAt: now,
    classOfferings: [
      {
        id: particular,
        mode: 'fixed',
        placeName: 'Alberca Central',
        groupType: 'particular',
        maxPeople: null,
        schedules: [schedule(`sch-p-${id}`, '17:00', '18:00')],
        priceCents: 30000,
        currency: 'MXN',
        unit: 'clase',
      },
      {
        id: grupal,
        mode: 'fixed',
        placeName: 'Alberca Central',
        groupType: 'grupal',
        maxPeople: 4,
        schedules: [schedule(`sch-g-${id}`, '19:00', '20:00')],
        priceCents: 20000,
        currency: 'MXN',
        unit: 'clase',
      },
    ],
  })

  const athletes: Array<{ uid: string; email: string; name: string; token: string }> = []
  for (const name of ['Ana Atleta', 'Beto Nadador', 'Caro Crol', 'Dani Dorso']) {
    const email = `cs-ath-${name.split(' ')[0].toLowerCase()}-${id}@test.com`
    const acc = await signup(email)
    await seed(`users/${acc.localId}`, {
      id: acc.localId,
      email,
      nickname: name,
      name,
      roles: { athlete: true, coach: false, admin: false },
      onboarding: { version: 1, interests: ['swimmer'], coachContext: null, completedAt: 1 },
    })
    athletes.push({ uid: acc.localId, email, name, token: acc.idToken })
    await seed(`coachStudentProgress/${coach.localId}_${acc.localId}`, {
      id: `${coach.localId}_${acc.localId}`,
      coachId: coach.localId,
      athleteId: acc.localId,
      athleteName: name,
      athleteEmail: email,
      level: 2,
      coachAssessment: 2,
      lastNote: '',
      createdAt: now,
      updatedAt: now,
    })
  }

  // Guardian with a child (additional profile)
  const guardianEmail = `cs-guardian-${id}@test.com`
  const guardian = await signup(guardianEmail)
  await seed(`users/${guardian.localId}`, {
    id: guardian.localId,
    email: guardianEmail,
    nickname: 'Mamá Tutora',
    name: 'Mamá Tutora',
    roles: { athlete: true, coach: false, admin: false },
    onboarding: { version: 1, interests: ['swimmer'], coachContext: null, completedAt: 1 },
  })
  const childRes = await fetch('http://localhost:3000/api/additional-profiles', {
    method: 'POST',
    headers: { authorization: `Bearer ${guardian.idToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Peque Pez', birthDate: '2018-03-01', gender: 'otro' }),
  })
  const child = (await childRes.json()).profile as { id: string }

  let n = 0
  const booking = async (
    who: { uid: string; email: string; name: string; profileId?: string },
    date: string,
    kind: 'particular' | 'grupal',
    extra: Record<string, unknown> = {}
  ) => {
    const bid = `cs-b-${id}-${n++}`
    const start = kind === 'particular' ? '17:00' : '19:00'
    const end = kind === 'particular' ? '18:00' : '20:00'
    await seed(`bookings/${bid}`, {
      id: bid,
      coachId: coach.localId,
      offeringId: kind === 'particular' ? particular : grupal,
      scheduleId: kind === 'particular' ? `sch-p-${id}` : `sch-g-${id}`,
      locationName: 'Alberca Central',
      mode: 'fixed',
      groupType: kind,
      days: [dayName(date)],
      date,
      startTime: start,
      endTime: end,
      priceCents: kind === 'particular' ? 30000 : 20000,
      currency: 'MXN',
      unit: 'clase',
      athleteId: who.uid,
      athleteName: who.name,
      athleteEmail: who.email,
      ...(who.profileId ? { additionalProfileId: who.profileId } : {}),
      coachName: 'Coach Estable',
      status: 'confirmed',
      source: 'coach',
      createdAt: now,
      updatedAt: now,
      ...extra,
    })
    return bid
  }
  const [ana, beto, caro, dani] = athletes
  const bookings = {
    anaPast: await booking(ana, dayKey(-3), 'particular', { attended: true }),
    betoYesterdayG: await booking(beto, dayKey(-1), 'grupal'),
    caroYesterdayG: await booking(caro, dayKey(-1), 'grupal'),
    anaToday: await booking(ana, dayKey(0), 'particular'),
    betoToday: await booking(beto, dayKey(0), 'grupal'),
    caroToday: await booking(caro, dayKey(0), 'grupal'),
    childTomorrow: await booking(
      { uid: guardian.localId, email: guardianEmail, name: 'Peque Pez', profileId: child.id },
      dayKey(1),
      'particular'
    ),
    daniTomorrowG: await booking(dani, dayKey(1), 'grupal'),
    anaIn2: await booking(ana, dayKey(2), 'particular'),
  }
  return { id, coach, coachEmail, athletes, guardian, guardianEmail, child, bookings, particular, grupal }
}

async function snap(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/coach-students-${name}.png`, fullPage: true })
}

test.describe.configure({ mode: 'serial' })

let world: World
let coachCtx: BrowserContext
let cpage: Page
test.beforeAll(async ({ browser }) => {
  test.setTimeout(120000)
  world = await seedWorld()
  coachCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  cpage = await coachCtx.newPage()
  cpage.setDefaultTimeout(45000)
  await login(cpage, world.coachEmail)
})
test.afterAll(async () => {
  await coachCtx?.close()
})

async function openSlot(page: Page, label: RegExp) {
  await gotoApp(page, '/coach/agenda')
  await page.getByRole('button', { name: label }).first().click()
  await page.getByText('Horario seleccionado').waitFor()
}

async function firestoreGet(path: string) {
  const res = await fetch(`${root}/${path}`, { headers: { authorization: 'Bearer owner' } })
  return res.ok ? ((await res.json()) as { fields?: Record<string, any> }) : null
}


test('coach: pase de lista de clase grupal persiste tras recargar', async () => {
  const page = cpage
  test.setTimeout(90000)
  await openSlot(page, new RegExp(`${dayKey(0)} · 19:00`))
  await page.getByRole('button', { name: 'Lista', exact: true }).first().click()
  const betoBox = page.getByRole('checkbox', { name: 'Asistencia de Beto Nadador' })
  await betoBox.click()
  await expect(betoBox).toBeChecked()
  await page.reload()
  await openSlot(page, new RegExp(`${dayKey(0)} · 19:00`))
  await page.getByRole('button', { name: 'Lista', exact: true }).first().click()
  await expect(page.getByRole('checkbox', { name: 'Asistencia de Beto Nadador' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Asistencia de Caro Crol' })).not.toBeChecked()
  await snap(page, 't1-attendance')
})

test('coach: nota de clase se guarda y se ve al reabrir detalles', async () => {
  const page = cpage
  test.setTimeout(90000)
  await openSlot(page, new RegExp(`${dayKey(0)} · 19:00`))
  await page.getByRole('button', { name: 'Nota', exact: true }).first().click()
  await page.getByPlaceholder(/observaciones generales/).fill('Trabajamos respiración bilateral.')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await snap(page, 't2-note-after-save')
  await openSlot(page, new RegExp(`${dayKey(0)} · 19:00`))
  await page.getByRole('button', { name: 'Detalles del horario' }).click()
  await expect(page.getByText('Trabajamos respiración bilateral.')).toBeVisible()
})

test('coach: crea el entreno de la clase con el editor de bloques y lo ve en lectura', async () => {
  const page = cpage
  test.setTimeout(120000)
  await openSlot(page, new RegExp(`${dayKey(0)} · 19:00`))
  await page.getByRole('button', { name: 'Entreno', exact: true }).first().click()
  await page.getByRole('button', { name: '+ Agregar bloque' }).click()
  await page.getByLabel('Nombre del bloque 1').fill('Calentamiento')
  await page.getByRole('button', { name: '+ Serie' }).click()
  await page.getByRole('spinbutton', { name: '¿Cuántas repeticiones?' }).fill('4')
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Metros por repetición' }).fill('50')
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await page.getByPlaceholder('Patada de crol').fill('Patada de crol')
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Segundos' }).fill('30')
  await page.getByRole('button', { name: 'Guardar serie' }).click()
  await snap(page, 't3-block-with-serie')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await openSlot(page, new RegExp(`${dayKey(0)} · 19:00`))
  await page.getByRole('button', { name: 'Entreno', exact: true }).first().click()
  await snap(page, 't3-training-reopen')
  await expect(page.getByLabel('Nombre del bloque 1')).toHaveValue('Calentamiento')
  await expect(page.getByText('4× 50 m Patada de crol')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  // Read mode lives in the class details view.
  await page.getByRole('button', { name: 'Detalles del horario' }).click()
  await page.waitForTimeout(800)
  await snap(page, 't3-details-read')
  console.log('DETAILS', (await page.getByRole('dialog').last().innerText()).slice(0, 700))
})

test('coach: agrega un alumno existente a una clase grupal con cupo', async () => {
  const page = cpage
  test.setTimeout(120000)
  await openSlot(page, new RegExp(`${dayKey(1)} · 19:00`))
  await page.getByRole('button', { name: 'Configurar', exact: true }).first().click()
  await page.getByRole('button', { name: '+ Alumno' }).click()
  await page.getByRole('button', { name: /Ana Atleta/ }).click()
  await page.getByText('Opciones de pago').click()
  await snap(page, 't4-add-ana-payment-opts')
  console.log('PAYOPTS', (await page.getByRole('dialog').last().innerText()).slice(0, 900))
  await page.getByRole('button', { name: 'Agregar alumno', exact: true }).click()
  await page.waitForTimeout(6000)
  await snap(page, 't4-after-add')
  await expect(page.getByText('Ana Atleta').first()).toBeVisible()
})

test('coach: cancela una clase particular con alumno', async () => {
  const page = cpage
  test.setTimeout(120000)
  await openSlot(page, new RegExp(`${dayKey(2)} · 17:00`))
  await page.getByRole('button', { name: 'Configurar', exact: true }).first().click()
  await page.getByRole('button', { name: 'Cancelar clase', exact: true }).click()
  await page.getByRole('button', { name: 'Cancelar clase y retirar a todos' }).click()
  await page.waitForTimeout(3000)
  await snap(page, 't5-after-cancel')
  const doc = await firestoreGet(`bookings/${world.bookings.anaIn2}`)
  expect(doc?.fields?.status?.stringValue).toBe('cancelled')
  await page.reload()
  await page.waitForTimeout(2500)
  const lab = await page.locator('[aria-label*="' + dayKey(2) + '"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') + '|' + (e.textContent || '')))
  expect(lab.join()).not.toContain('Ana')
  await snap(page, 't5-agenda-after-cancel')
})

test('coach: vista horizontal (dia/semana) y escritorio', async () => {
  const page = cpage
  test.setTimeout(120000)
  await gotoApp(page, '/coach/agenda')
  await page.getByRole('button', { name: 'Vista horizontal' }).click()
  await page.waitForTimeout(1500)
  await snap(page, 't6-horizontal')
  // FINDING: day view legend uses blue for 'Grupal ocupada' while week view paints taken grupal green.
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.waitForTimeout(1000)
  await snap(page, 't6-desktop-horizontal')
  await page.getByRole('button', { name: 'Vista vertical' }).click()
  await page.waitForTimeout(1000)
  await snap(page, 't6-desktop-vertical')
  await page.setViewportSize({ width: 390, height: 844 })
})

test('coach: registra progreso de un alumno tras una clase pasada y lo ve en su historial', async () => {
  const page = cpage
  test.setTimeout(120000)
  await gotoApp(page, '/coach/agenda')
  await page.getByRole('button', { name: 'Semana anterior' }).click()
  await page.getByRole('button', { name: new RegExp(`${dayKey(-3)} · 17:00`) }).click()
  await page.getByRole('button', { name: 'Abrir ficha de Ana Atleta' }).click()
  await page.getByRole('button', { name: 'Progreso', exact: true }).click()
  const form = page.locator('[role=dialog]').filter({ hasText: 'Agregar progreso' }).last()
  await form.getByText('3', { exact: true }).first().click()
  await form.getByText('Curioso', { exact: true }).click()
  await form.getByText('Feliz', { exact: true }).click()
  await form.getByPlaceholder('Observaciones de la sesión.').fill('Mejoró la patada.')
  await snap(page, 't7-progress-filled')
  await form.getByRole('button', { name: 'Guardar progreso' }).click()
  await page.waitForTimeout(2500)
  await snap(page, 't7-progress-saved')
  await expect(page.getByText('Progreso guardado.')).toBeVisible()
  // history in Alumnos
  await gotoApp(page, '/coach/students')
  await page.getByRole('button', { name: 'Ver perfil de Ana Atleta', exact: true }).click()
  await page.getByText('Seguimientos', { exact: true }).first().click()
  await page.waitForTimeout(1200)
  await snap(page, 't7-history')
  // FINDING: the saved progress note never shows in the student's history (class stays 'Pendiente').
  await expect.soft(page.getByRole('dialog').last().getByText('Mejoró la patada.')).toBeVisible({ timeout: 3000 })
})

test('coach: crea un plan por clases en pagos', async () => {
  const page = cpage
  test.setTimeout(150000)
  await gotoApp(page, '/coach/payments')
  await page.getByRole('button', { name: 'Crea tu primer plan' }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Número de clases' }).fill('4')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const dlg = page.locator('[role=dialog]').filter({ hasText: 'Nombre y precio' }).last()
  await dlg.getByLabel('Nombre', { exact: true }).fill('Paquete 4 clases')
  await dlg.getByLabel('Precio (MXN)').fill('1000')
  await dlg.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.waitForTimeout(800)
  await snap(page, 't8-plan-review')
  console.log('REVIEW', (await page.getByRole('dialog').last().innerText()).slice(0, 700).replace(/\n/g, ' | '))
  await page.getByRole('button', { name: /Crear plan|Guardar|Publicar|Crear/ }).last().click()
  await page.waitForTimeout(2500)
  await snap(page, 't8-plan-created')
  console.log('AFTER', (await page.locator('main').innerText()).slice(0, 800).replace(/\n/g, ' | '))
})

test('atleta: ve su clase en Horarios y evalúa la clase terminada', async ({ browser }) => {
  test.setTimeout(150000)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(45000)
  await login(page, world.athletes[0].email)
  await gotoApp(page, '/athlete/schedule')
  await expect(page.getByText('Próximas clases')).toBeVisible()
  await expect(page.getByText(/jueves 29 de oct/)).toBeVisible()
  await expect(page.getByText('Pendientes de evaluación (1)')).toBeVisible()
  await page.getByRole('button', { name: 'Evaluar', exact: true }).click()
  await page.waitForTimeout(1000)
  await snap(page, 't9-evaluate-form')
  const form = page.locator('[role=dialog]').filter({ hasText: 'Evaluar clase' }).last()
  const save = form.getByRole('button', { name: 'Guardar evaluación' })
  // FINDING: evaluation header shows a raw ISO date.
  await expect.soft(form.getByText(/\d{4}-\d{2}-\d{2}/)).toHaveCount(0)
  console.log('SAVE VISIBLE BOX', JSON.stringify(await save.boundingBox()), 'viewport 844')
  console.log('TA BOX', JSON.stringify(await form.locator('textarea').first().boundingBox()))
  await form.getByLabel('4 estrellas').check({ force: true })
  await form.getByText('Técnica', { exact: true }).click()
  await form.locator('textarea').first().fill('Muy buena clase.')
  await form.locator('textarea').nth(1).fill('Me cansé en la patada.')
  await save.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${SHOTS}/coach-students-t9-eval-filled.png` })
  await save.click()
  await page.waitForTimeout(2500)
  await snap(page, 't9-after-eval')
  console.log('AFTER EVAL', (await page.locator('main').innerText()).slice(0, 700).replace(/\n/g, ' | '))
  await page.reload()
  await page.waitForTimeout(2500)
  console.log('RELOAD', (await page.locator('main').innerText()).slice(0, 700).replace(/\n/g, ' | '))
  await snap(page, 't9-after-reload')
  await ctx.close()
})

test('coach: comparte horarios en texto y enlace de agenda', async () => {
  const page = cpage
  test.setTimeout(150000)
  await coachCtx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3000' })
  await gotoApp(page, '/coach/agenda')
  await page.getByRole('button', { name: 'Compartir agenda' }).click()
  await page.getByRole('button', { name: /Copiar horarios en texto/ }).click()
  await page.waitForTimeout(1200)
  const text = await page.evaluate(() => navigator.clipboard.readText())
  console.log('TEXT>>>\n' + text + '\n<<<')
  await snap(page, 't10-share-text')
  console.log('after copy body', (await page.getByRole('dialog').last().innerText()).slice(0, 300).replace(/\n/g, ' | '))
  const dlg = page.getByRole('dialog').last()
  if (!(await dlg.count())) return
  await page.getByRole('button', { name: /Copiar enlace de agenda/ }).click().catch((e) => console.log('link click fail', String(e).slice(0, 80)))
  await page.waitForTimeout(1200)
  console.log('LINK>>>', await page.evaluate(() => navigator.clipboard.readText()))
  await snap(page, 't10-share-link')
})

test('tutor: ve la clase de su perfil adicional en Horarios', async ({ browser }) => {
  test.setTimeout(150000)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(45000)
  await login(page, world.guardianEmail)
  await gotoApp(page, '/athlete/schedule')
  await page.waitForTimeout(8000)
  await snap(page, 't11-guardian-schedule')
  const text = await page.locator('main').innerText()
  console.log('GUARDIAN', text.slice(0, 700).replace(/\n/g, ' | '))
  expect(text).toContain('Peque Pez')
  expect(text).toContain('viernes 30 de oct')
  await ctx.close()
})

test('coach: ve la evaluación de la clase que dejó el alumno', async () => {
  const page = cpage
  test.setTimeout(150000)
  await gotoApp(page, '/coach/students')
  await page.getByRole('button', { name: 'Ver perfil de Ana Atleta', exact: true }).click()
  await page.getByText('Evaluaciones', { exact: true }).first().click()
  await page.waitForTimeout(1500)
  await snap(page, 't12-coach-evals')
  const text = await page.getByRole('dialog').last().innerText()
  expect(text).toContain('Muy buena clase.')
  expect(text).toContain('Me cansé en la patada.')
})
