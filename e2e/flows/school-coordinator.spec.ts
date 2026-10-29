import { expect, type Page, test } from '@playwright/test'

const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
const SHOTS =
  '/private/tmp/claude-501/-Users-zarza-Documents-projects-nadamas/cac27305-4eea-4c23-ae5d-b01232a15e92/scratchpad/flow-agents/shots'
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${SHOTS}/school-coordinator-${name}.png`, fullPage: true })

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
  if (!page.url().includes('/login')) await page.goto('/login')
  const policy = page.getByRole('button', { name: 'Aceptar política y continuar' })
  const emailField = page.getByLabel('Correo', { exact: true })
  await policy.or(emailField).first().waitFor()
  if (await policy.count()) await policy.click()
  await emailField.fill(email)
  await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'))
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const ymd = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const dayName = (date: string) => DAYS[new Date(`${date}T12:00:00`).getDay()]

type World = Awaited<ReturnType<typeof seedWorld>>

function offering(
  id: string,
  groupType: 'particular' | 'grupal',
  slots: Array<{ start: string; end: string; date: string }>
) {
  return {
    id,
    mode: 'fixed',
    placeName: 'Alberca Central',
    groupType,
    currency: 'MXN',
    unit: 'clase',
    schedules: slots.map((slot, i) => ({
      id: `${id}-s${i}`,
      startTime: slot.start,
      endTime: slot.end,
      timeMode: 'fixed',
      days: [dayName(slot.date)],
      availabilityMode: 'dates',
      availableDates: [slot.date],
    })),
  }
}

/** Director + 3 teachers (different hours) + 10 students (3 guardian-managed kids) + bookings. */
async function seedWorld(options: { slug?: string } = {}) {
  const id = crypto.randomUUID().slice(0, 8)
  const schoolId = `coord-${id}`
  const now = Date.now()
  const dEmail = `coord-dir-${id}@test.com`
  const director = await signup(dEmail)
  await seed(`users/${director.localId}`, {
    email: dEmail,
    nickname: 'Directora Coordi',
    firstName: 'Directora',
    roles: { athlete: true, coach: true, admin: false },
    onboarding: { version: 1, completedAt: Date.now(), interests: ['coordinator'] },
  })
  await seed(`schools/${schoolId}`, {
    name: `Escuela Coordi ${id}`,
    slug: options.slug || schoolId,
    directorId: director.localId,
    createdBy: director.localId,
    ownerId: director.localId,
    timezone: 'America/Mexico_City',
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  })
  await seed(`schoolMemberships/${schoolId}_${director.localId}`, {
    schoolId,
    userId: director.localId,
    role: 'director',
    roles: ['director'],
    status: 'active',
  })
  await seed(`schoolSubscriptions/${schoolId}`, {
    schoolId,
    ownerId: director.localId,
    trialStartedAt: now,
    trialEndsAt: now + 20 * 86400000,
    periodStartedAt: null,
    periodEndsAt: null,
    cancelAtPeriodEnd: false,
    promotionalCodeId: null,
    promotionalGrantedAt: null,
    pendingOrderId: null,
    provisionalOrderId: null,
    createdAt: now,
    updatedAt: now,
  })
  const teachers: Array<{ uid: string; email: string; name: string; token: string }> = []
  for (const [i, name] of ['Ana', 'Beto', 'Carla'].entries()) {
    const email = `coord-t${i}-${id}@test.com`
    const t = await signup(email)
    await seed(`users/${t.localId}`, {
      email,
      nickname: `Profe ${name}`,
      firstName: name,
      roles: { athlete: true, coach: true, admin: false },
    })
    await seed(`schoolMemberships/${schoolId}_${t.localId}`, {
      schoolId,
      userId: t.localId,
      role: 'teacher',
      roles: ['teacher'],
      status: 'active',
    })
    teachers.push({ uid: t.localId, email, name: `Profe ${name}`, token: t.idToken })
  }
  const d1 = ymd(2)
  const d2 = ymd(3)
  const plans = [
    offering('ofa', 'particular', [
      { start: '08:00', end: '09:00', date: d1 },
      { start: '09:00', end: '10:00', date: d1 },
    ]),
    offering('ofb', 'grupal', [
      { start: '08:00', end: '09:00', date: d1 }, // overlaps Ana
      { start: '17:00', end: '18:00', date: d2 },
    ]),
    offering('ofc', 'particular', [{ start: '10:00', end: '11:00', date: d2 }]),
  ]
  const headers = { authorization: `Bearer ${director.idToken}`, 'content-type': 'application/json' }
  for (const [i, t] of teachers.entries()) {
    const res = await fetch(`http://localhost:3000/api/schools/${schoolId}/teachers/${t.uid}/schedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ classOfferings: [plans[i]] }),
    })
    expect(res.ok, await res.text()).toBe(true)
  }
  const students: Array<{ id: string; name: string }> = []
  for (let i = 0; i < 7; i++) {
    const sid = `${schoolId}_s${i}`
    await seed(`schoolStudents/${sid}`, {
      schoolId,
      name: `Alumno ${i + 1}`,
      status: 'active',
      createdBy: director.localId,
    })
    students.push({ id: sid, name: `Alumno ${i + 1}` })
  }
  const gEmail = `coord-guardian-${id}@test.com`
  const guardian = await signup(gEmail)
  await seed(`users/${guardian.localId}`, {
    email: gEmail,
    nickname: 'Mamá Tutora',
    roles: { athlete: true, coach: false, admin: false },
  })
  await seed(`schoolMemberships/${schoolId}_${guardian.localId}`, {
    schoolId,
    userId: guardian.localId,
    role: 'student',
    roles: ['student'],
    status: 'active',
  })
  for (let i = 0; i < 3; i++) {
    const sid = `${schoolId}_k${i}`
    await seed(`schoolStudents/${sid}`, {
      schoolId,
      name: `Peque ${i + 1}`,
      status: 'active',
      guardianIds: [guardian.localId],
      managerIds: [guardian.localId],
      createdBy: director.localId,
    })
    students.push({ id: sid, name: `Peque ${i + 1}` })
  }
  for (const [i, t] of teachers.entries())
    await seed(`bookings/${schoolId}_b${i}`, {
      schoolId,
      coachId: t.uid,
      coachName: t.name,
      athleteId: students[i].id,
      athleteName: students[i].name,
      athleteEmail: null,
      offeringId: plans[i].id,
      scheduleId: plans[i].schedules[0].id,
      locationName: 'Alberca Central',
      mode: 'fixed',
      groupType: plans[i].groupType,
      days: plans[i].schedules[0].days,
      date: plans[i].schedules[0].availableDates[0],
      startTime: plans[i].schedules[0].startTime,
      endTime: plans[i].schedules[0].endTime,
      priceCents: null,
      currency: 'MXN',
      unit: 'clase',
      status: 'confirmed',
      source: 'coach',
      createdAt: now,
      updatedAt: now,
    })
  return { id, schoolId, director, dEmail, teachers, students, guardian, gEmail, d1, d2 }
}

test.use({ viewport: { width: 390, height: 844 } })

async function fillToBasicLimit(w: World) {
  // seedWorld has 3 teachers + 10 students; top up to 5 teachers / 100 students.
  for (let i = 0; i < 2; i++)
    await seed(`schoolMemberships/${w.schoolId}_fill-t${i}`, {
      schoolId: w.schoolId,
      userId: `fill-t${i}`,
      role: 'teacher',
      roles: ['teacher'],
      status: 'active',
    })
  await Promise.all(
    Array.from({ length: 90 }, (_, i) =>
      seed(`schoolStudents/${w.schoolId}_fill${i}`, {
        schoolId: w.schoolId,
        name: `Relleno ${i}`,
        status: 'active',
        createdBy: w.director.localId,
      })
    )
  )
}

const LIMIT_TEXT =
  'Llegaste al límite de tu plan Básico (5 profes / 100 alumnos). Contáctanos para un plan personalizado.'

async function createAdmin() {
  const email = `coord-admin-${crypto.randomUUID().slice(0, 8)}@test.com`
  const admin = await signup(email)
  await seed(`users/${admin.localId}`, {
    email,
    nickname: 'Admin QA',
    roles: { athlete: true, coach: false, admin: true },
    onboarding: { version: 1, completedAt: Date.now(), interests: ['swimmer'] },
  })
  return admin
}

test('limits: Básico 5/100 → Contáctanos (director) / Avísale (members); admin custom plan lifts it', async ({
  page,
  browser,
}) => {
  test.setTimeout(420000)
  page.setDefaultTimeout(45000)
  const w: World = await seedWorld()
  const post = (path: string, token: string, body: unknown) =>
    fetch(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  // Invitations sent while there was still room.
  const teacherEmail = `coord-late-t-${w.id}@test.com`
  const studentEmail = `coord-late-s-${w.id}@test.com`
  const urls: Record<string, string> = {}
  for (const [email, role] of [
    [teacherEmail, 'teacher'],
    [studentEmail, 'student'],
  ] as const) {
    const res = await post(`/api/schools/${w.schoolId}/invitations`, w.director.idToken, {
      email,
      role,
    })
    expect(res.status).toBe(201)
    urls[role] = (await res.json()).inviteUrl
  }
  await fillToBasicLimit(w)

  await login(page, w.dEmail)
  await page.goto(`/school/subscription?schoolId=${w.schoolId}`)
  await expect(page.getByText('5 de 5 profes')).toBeVisible()
  await expect(page.getByText('100 de 100 alumnos')).toBeVisible()
  await shot(page, 'limits-subscription')

  // Director inviting a 6th teacher from the UI.
  await page.goto(`/school/coaches?schoolId=${w.schoolId}`)
  await page.getByRole('button', { name: /Invitar entrenador/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Invitar entrenador' })
  await dialog.getByLabel('Correo electrónico', { exact: true }).fill(`sixth-${w.id}@test.com`)
  await dialog.getByRole('button', { name: 'Enviar', exact: true }).click()
  const notice = dialog.getByRole('alert').filter({ hasText: LIMIT_TEXT })
  await expect(notice).toBeVisible()
  await expect(notice.getByRole('link', { name: 'Contáctanos' })).toHaveAttribute(
    'href',
    '/contacto'
  )
  await shot(page, 'limits-director-sixth-teacher')

  // Members accepting late invitations get the member copy.
  const accept = async (role: 'teacher' | 'student', email: string) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const p2 = await ctx.newPage()
    p2.setDefaultTimeout(60000)
    await signup(email).catch(() => null)
    await login(p2, email)
    await p2.goto(urls[role])
    if (role === 'teacher') {
      await expect(p2).toHaveURL(/\/coach\/invitations\//)
      await p2.getByLabel('Nombre completo').fill('Profe Tarde')
      await p2.locator('input[type=tel]').first().fill('5512345678')
      await p2.getByRole('button', { name: 'Aceptar invitación' }).click()
    } else {
      await p2.getByRole('checkbox', { name: /Mi perfil/ }).check()
      await p2.getByRole('button', { name: 'Agregar a la escuela' }).click()
    }
    return { ctx, p2 }
  }
  for (const [role, email] of [
    ['teacher', teacherEmail],
    ['student', studentEmail],
  ] as const) {
    const { ctx, p2 } = await accept(role, email)
    await p2.waitForTimeout(6000)
    await shot(p2, `limits-member-${role}`)
    console.log(`MEMBER ${role}:`, (await p2.locator('body').innerText()).split('\n').filter((l) => /límite|Avísale|Contáctanos|equipo|Todo listo/.test(l)))
    await ctx.close()
  }

  // Admin lifts the limit with a Personalizado plan.
  const admin = await createAdmin()
  const lift = await post('/api/subscriptions/admin', admin.idToken, {
    action: 'setCustomPlan',
    schoolId: w.schoolId,
    limits: { teachers: 8, students: 150 },
    reason: 'QA plan personalizado',
  })
  expect(lift.status, await lift.clone().text()).toBe(200)
  await page.goto(`/school/subscription?schoolId=${w.schoolId}`)
  console.log('SUB AFTER CUSTOM', await page.locator('main').innerText())
  await shot(page, 'limits-custom-subscription')
  await expect(page.getByText(/5 de 8 profes/)).toBeVisible()
  await page.goto(`/school/coaches?schoolId=${w.schoolId}`)
  await page.getByRole('button', { name: /Invitar entrenador/ }).click()
  await dialog.getByLabel('Correo electrónico', { exact: true }).fill(`seventh-${w.id}@test.com`)
  await dialog.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText(`seventh-${w.id}@test.com`)).toBeVisible()
  await expect(dialog.getByRole('alert').filter({ hasText: 'límite' })).toHaveCount(0)
})

test('create: new user onboards as coordinator, trial checkbox, creates school, setup checklist', async ({
  page,
}) => {
  test.setTimeout(180000)
  page.setDefaultTimeout(45000)
  const id = crypto.randomUUID().slice(0, 8)
  const email = `coord-new-${id}@test.com`
  await signup(email)
  await login(page, email)
  await expect(page).toHaveURL(/\/welcome/)
  await page.getByRole('checkbox', { name: /Coordino una escuela/ }).check()
  await page.getByRole('button', { name: /Ver mis primeros pasos/ }).click()
  await page.getByRole('link', { name: /Crear mi escuela/ }).click()
  await page.waitForURL('**/school/create')
  await expect(page.getByText('Suscripción básica gratis por 30 días')).toBeVisible()
  await page.getByLabel('Nombre de la escuela').fill(`Escuela Coord ${id}`)
  await page.getByLabel(/Slug/).fill(`coord-${id}`)
  await page.getByRole('button', { name: 'Crear escuela' }).click()
  await page.waitForURL(/created=/)
  // FINDING: copy says "Continúa con su configuración" but the only forward CTA is the public page.
  await expect(page.getByText('Tu escuela ya está creada. Continúa con su configuración.')).toBeVisible()
  await shot(page, 'after-create')
  await page.goto('/school')
  await expect(page.getByText('Gratuita · quedan 30 días')).toBeVisible()
  await page.goto('/school/setup')
  await expect(page.getByText('1/5 pasos completos')).toBeVisible()
  await expect(page.getByRole('link', { name: /Configurar: Configurar un plan de pago/ })).toBeVisible()
  await page.goto('/school/subscription')
  await expect(page.getByText('Plan Básico · 0 de 5 profes · 0 de 100 alumnos')).toBeVisible()
})

test('home: "Termina la configuración" card opens the setup checklist (FINDING: goes to settings)', async ({
  page,
}) => {
  test.setTimeout(180000)
  page.setDefaultTimeout(45000)
  const w: World = await seedWorld()
  await login(page, w.dEmail)
  await page.goto(`/school?schoolId=${w.schoolId}`)
  await page.getByRole('link', { name: /Termina la configuración de tu escuela/ }).click()
  await page.waitForTimeout(2500)
  await shot(page, 'checklist-card-target')
  await expect(page).toHaveURL(/\/school\/setup/)
})

test('settings: the four groups open with their cards', async ({ page }) => {
  test.setTimeout(180000)
  page.setDefaultTimeout(45000)
  const w: World = await seedWorld()
  await login(page, w.dEmail)
  await page.goto(`/school/settings?schoolId=${w.schoolId}`)
  const expectations: Record<string, string> = {
    'Tu escuela': 'Datos de la escuela',
    'Página de tu escuela': 'Paleta de colores',
    'Eventos y enlaces': 'Nuevo evento',
    'Reservas y calendario': 'Sincronizar calendario',
  }
  for (const [group, text] of Object.entries(expectations)) {
    await page.locator('summary', { hasText: new RegExp(`^${group}`) }).click()
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('agenda: Todos adds hours for every owner, unassigned class, no duplicates', async ({
  page,
}) => {
  test.setTimeout(240000)
  page.setDefaultTimeout(45000)
  const w: World = await seedWorld()
  await login(page, w.dEmail)
  await page.goto(`/school/classes?schoolId=${w.schoolId}`)
  const editor = page.getByRole('dialog', { name: 'Editar horas', exact: true })
  const picker = page.getByRole('dialog', { name: 'Agregar horas', exact: true })
  const addHour = async (who: string, day: RegExp, hour: string) => {
    await page.getByRole('button', { name: /^(Editar horario|Agregar horario ahora)$/ }).click()
    await editor.getByRole('button', { name: who, exact: true }).click()
    await editor.getByRole('button', { name: day }).click()
    await editor.getByRole('button', { name: 'Agregar horas', exact: true }).click()
    await picker.getByRole('button', { name: hour, exact: true }).click()
    await picker.getByRole('button', { name: /^Agregar 1 hora/ }).click()
    await editor.getByRole('button', { name: /^Agregar \d+ horarios?$/ }).click()
    await expect(editor).not.toBeVisible()
  }
  await addHour('Todos', /^Vie/, '12:00')
  // today is preselected too: 2 days x 4 owners (3 profes + the director) = 8
  const headers = { authorization: `Bearer ${w.director.idToken}` }
  const agenda = async () =>
    (
      await (
        await fetch(
          `http://localhost:3000/api/schools/${w.schoolId}/agenda?month=${new Date().toISOString().slice(0, 7)}`,
          { headers }
        )
      ).json()
    ).availableSlots as Array<{ coachId: string; startTime: string; date: string }>
  const noon = (await agenda()).filter((slot) => slot.startTime === '12:00')
  expect(new Set(noon.map((slot) => slot.coachId)).size).toBe(4)
  await addHour('Todos', /^Vie/, '12:00')
  expect((await agenda()).filter((slot) => slot.startTime === '12:00')).toHaveLength(noon.length)
  await addHour('Sin profe aún', /^Vie/, '15:00')
  await expect(page.getByText('Sin profe aún').first()).toBeVisible()
  await shot(page, 'agenda-unassigned')
  // Overlapping hours (Ana + Beto both 08:00 on the same day) are listed side by side.
  await expect(page.getByText('08:00').first()).toBeVisible()
})

test('invites: teacher + student accept in another browser context; seats update', async ({
  page,
  browser,
}) => {
  test.setTimeout(300000)
  page.setDefaultTimeout(45000)
  const w: World = await seedWorld()
  await login(page, w.dEmail)
  await page.goto(`/school/coaches?schoolId=${w.schoolId}`)
  await page.getByRole('button', { name: /Invitar entrenador/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Invitar entrenador' })
  const uiEmail = `coord-ui-${w.id}@test.com`
  await dialog.getByLabel('Correo electrónico', { exact: true }).fill(uiEmail)
  await dialog.getByRole('button', { name: 'Enviar', exact: true }).click()
  // FINDING: a pending invite row has no resend / copy-link / cancel action.
  await expect(page.getByText(uiEmail)).toBeVisible()
  await shot(page, 'invite-teacher-sent')
  const post = (email: string, role: string) =>
    fetch(`http://localhost:3000/api/schools/${w.schoolId}/invitations`, {
      method: 'POST',
      headers: { authorization: `Bearer ${w.director.idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
  const run = async (role: 'teacher' | 'student') => {
    const email = `coord-new${role}-${w.id}@test.com`
    const res = await post(email, role)
    expect(res.status).toBe(201)
    const url = (await res.json()).inviteUrl as string
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const p2 = await ctx.newPage()
    p2.setDefaultTimeout(60000)
    await p2.goto(url)
    await expect(p2).toHaveURL(/\/login\?redirectTo=/)
    await signup(email)
    await login(p2, email)
    if (role === 'teacher') {
      await expect(p2).toHaveURL(/\/coach\/invitations\//)
      await p2.getByLabel('Nombre completo').fill('Profe Nuevo')
      await p2.locator('input[type=tel]').first().fill('5512345678')
      await p2.getByRole('button', { name: 'Aceptar invitación' }).click()
      await expect(p2.getByText('Ya formas parte del equipo de entrenadores.')).toBeVisible()
    } else {
      await expect(p2).toHaveURL(/\/athlete\/invitations\//)
      await p2.getByRole('checkbox', { name: /Mi perfil/ }).check()
      await p2.getByRole('button', { name: 'Agregar a la escuela' }).click()
      await expect(p2.getByText('Los perfiles seleccionados se agregaron')).toBeVisible()
    }
    await ctx.close()
  }
  await run('teacher')
  await run('student')
  await page.goto(`/school/subscription?schoolId=${w.schoolId}`)
  await expect(page.getByText('4 de 5 profes')).toBeVisible()
  await expect(page.getByText('11 de 100 alumnos')).toBeVisible()
})

test('public: subdomain home + athlete Horarios', async ({ page, browser }) => {
  test.setTimeout(240000)
  page.setDefaultTimeout(45000)
  const w: World = await seedWorld()
  await page.goto(`http://${w.schoolId}.localhost:3000/`)
  await expect(page.getByRole('link', { name: /Explorar horarios de la escuela/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Solicitar unirme al equipo/ })).toBeVisible()
  await shot(page, 'public-home')
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const gp = await ctx.newPage()
  gp.setDefaultTimeout(45000)
  const email = `coord-ath-${w.id}@test.com`
  await seed(`users/${(await signup(email)).localId}`, {
    email,
    nickname: 'Nadadora Horarios',
    roles: { athlete: true, coach: false, admin: false },
    onboarding: { version: 1, completedAt: Date.now(), interests: ['swimmer'] },
  })
  await login(gp, email)
  await gp.goto(`/athlete/search/school/${w.schoolId}/schedule?date=${w.d1}`)
  await expect(gp.getByText('Horarios de Escuela Coordi')).toBeVisible()
  // 3 teachers, overlapping 08:00 (Ana + Beto), unique 10:00 (Carla), 17:00 (Beto)
  await expect(gp.getByText('08:00').first()).toBeVisible()
  await expect(gp.getByText('17:00').first()).toBeVisible()
  await shot(gp, 'athlete-horarios')
  await ctx.close()
})
