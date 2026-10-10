import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'

// All fixtures use isolated IDs and the local Firebase emulators only.
test('pagos: permisos, confirmación idempotente, reservas, devoluciones y límites', async ({
  request,
  page,
}) => {
  test.setTimeout(60000)
  page.setDefaultTimeout(10000)
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const suffix = crypto.randomUUID(),
    schoolId = `payments-${suffix}`
  const hash = (...parts: string[]) =>
    createHash('sha256').update(JSON.stringify(parts)).digest('hex')
  function encode(value: unknown): unknown {
    if (typeof value === 'string') return { stringValue: value }
    if (typeof value === 'number') return { integerValue: String(value) }
    if (typeof value === 'boolean') return { booleanValue: value }
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
    if (value && typeof value === 'object')
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, encode(item)])
          ),
        },
      }
    return { nullValue: null }
  }
  async function seed(path: string, value: Record<string, unknown>) {
    const response = await fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])),
      }),
    })
    expect(response.ok).toBe(true)
  }
  async function signup(name: string, coach = false) {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `${name}-${suffix}@test.com`,
          password: 'local-test-password',
          returnSecureToken: true,
        }),
      }
    )
    const account = (await response.json()) as { localId: string; idToken: string; email: string }
    await seed(`users/${account.localId}`, {
      id: account.localId,
      email: account.email,
      nickname: name,
      roles: { athlete: true, coach, admin: false },
    })
    return account
  }
  const manager = await signup('manager', true),
    athlete = await signup('athlete'),
    outsider = await signup('outsider')
  const studentId = `${schoolId}_${athlete.localId}`,
    scope = `school:${schoolId}`,
    endpoint = `/api/payments?schoolId=${schoolId}`
  await seed(`schools/${schoolId}`, {
    id: schoolId,
    name: 'Escuela pagos',
    ownerId: manager.localId,
    timezone: 'America/Mazatlan',
  })
  for (const [account, role] of [
    [manager, 'director'],
    [athlete, 'student'],
  ] as const)
    await seed(`schoolMemberships/${schoolId}_${account.localId}`, {
      schoolId,
      userId: account.localId,
      role,
      roles: role === 'director' ? [role, 'teacher'] : [role],
      status: 'active',
    })
  await seed(`schoolStudents/${studentId}`, {
    id: studentId,
    schoolId,
    name: 'Alumno pagos',
    studentUserId: athlete.localId,
    status: 'active',
    guardianIds: [],
    managerIds: [],
  })
  const headers = (account = manager) => ({ authorization: `Bearer ${account.idToken}` })
  const post = (body: Record<string, unknown>, account = manager) =>
    request.post(endpoint, { headers: headers(account), data: body })
  const snapshot = async () => {
    const res = await request.get(endpoint, { headers: headers() })
    expect(res.ok(), await res.text()).toBe(true)
    return res.json()
  }
  const config = {
    classesEnabled: true,
    periodsEnabled: false,
    cancellationHours: 24,
    transferInstructions: 'Cuenta de prueba',
  }
  expect((await request.get(endpoint, { headers: headers(outsider) })).status()).toBe(403)
  expect((await post({ action: 'settings', settings: config }, athlete)).status()).toBe(403)
  expect((await post({ action: 'settings', settings: config })).ok()).toBe(true)
  const productResponse = await post({
    action: 'product',
    product: { name: 'Cinco clases', mode: 'classes', classes: 5, priceCents: 110000 },
  })
  expect(productResponse.ok(), await productResponse.text()).toBe(true)
  const product = (await productResponse.json()).product
  const purchase = await post(
    {
      action: 'purchase',
      studentId,
      productId: product.id,
      method: 'cash',
      operationId: crypto.randomUUID(),
    },
    athlete
  )
  expect(purchase.status(), await purchase.text()).toBe(201)
  const { id: orderId } = await purchase.json()
  expect((await snapshot()).accounts[studentId].grants).toHaveLength(0)
  expect((await post({ action: 'review', orderId, status: 'approved' }, athlete)).status()).toBe(
    403
  )
  const reviews = await Promise.all([
    post({ action: 'review', orderId, status: 'approved' }),
    post({ action: 'review', orderId, status: 'approved' }),
  ])
  for (const res of reviews) expect(res.ok(), await res.text()).toBe(true)
  expect((await snapshot()).accounts[studentId].grants).toHaveLength(1)
  const operationId = crypto.randomUUID()
  for (let n = 0; n < 2; n++)
    expect(
      (
        await post({
          action: 'adjust',
          studentId,
          quantity: 2,
          reason: 'Beca deportiva',
          operationId,
        })
      ).ok()
    ).toBe(true)
  expect(
    (await snapshot()).accounts[studentId].grants.reduce(
      (sum: number, g: { product: { classes: number } }) => sum + g.product.classes,
      0
    )
  ).toBe(7)
  const transfer = await post(
    {
      action: 'purchase',
      studentId,
      productId: product.id,
      method: 'transfer',
      operationId: crypto.randomUUID(),
    },
    athlete
  )
  const transferId = (await transfer.json()).id
  expect((await post({ action: 'review', orderId: transferId, status: 'approved' })).status()).toBe(
    409
  )
  const receiptEndpoint = `/api/payments/receipts?schoolId=${schoolId}&orderId=${transferId}`
  expect((await request.get(receiptEndpoint, { headers: headers(outsider) })).status()).toBe(403)
  expect(
    (
      await request.post(receiptEndpoint, {
        headers: headers(athlete),
        data: { data: 'data:application/pdf;base64,SGVsbG8=' },
      })
    ).status()
  ).toBe(400)
  const validReceipt = await request.post(receiptEndpoint, {
    headers: headers(athlete),
    data: {
      data: `data:application/pdf;base64,${Buffer.from('%PDF-1.4\n%%EOF').toString('base64')}`,
    },
  })
  expect(validReceipt.ok(), await validReceipt.text()).toBe(true)
  const downloaded = await request.get(receiptEndpoint, { headers: headers(athlete) })
  expect(downloaded.ok(), await downloaded.text()).toBe(true)
  expect(downloaded.headers()['cache-control']).toContain('private')
  const proof = (await snapshot()).orders.find((order: { id: string }) => order.id === transferId)
  const publicReceipt = await fetch(
    `http://127.0.0.1:9199/v0/b/nadamas-b1ecf.appspot.com/o/${encodeURIComponent(proof.receiptPath)}?alt=media`
  )
  expect(publicReceipt.status).toBe(403)
  expect((await post({ action: 'review', orderId: transferId, status: 'approved' })).ok()).toBe(
    true
  )
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    occurrenceId = `class-${suffix}`
  await seed(`schoolClassOccurrences/${occurrenceId}`, {
    id: occurrenceId,
    seriesId: occurrenceId,
    schoolId,
    title: 'Clase pagos',
    type: 'group',
    date,
    startTime: '18:00',
    endTime: '19:00',
    teacherIds: [manager.localId],
    studentIds: [],
    status: 'scheduled',
    timezone: 'America/Mazatlan',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  const enroll = `/api/schools/${schoolId}/classes/${occurrenceId}/students`
  const enrollment = await request.post(enroll, {
    headers: headers(),
    data: { studentIds: [studentId] },
  })
  expect(enrollment.ok(), await enrollment.text()).toBe(true)
  let account = (await snapshot()).accounts[studentId]
  expect(account.grants.reduce((sum: number, g: { reserved: number }) => sum + g.reserved, 0)).toBe(
    1
  )
  const cancel = await request.patch(`/api/schools/${schoolId}/classes/${occurrenceId}`, {
    headers: headers(),
    data: { status: 'cancelled' },
  })
  expect(cancel.ok(), await cancel.text()).toBe(true)
  account = (await snapshot()).accounts[studentId]
  expect(account.grants.reduce((sum: number, g: { reserved: number }) => sum + g.reserved, 0)).toBe(
    0
  )
  expect(account.grants.reduce((sum: number, g: { used: number }) => sum + g.used, 0)).toBe(0)
  // Scope isolation: a forged account ID cannot be used to adjust another student.
  expect(
    (
      await post({
        action: 'adjust',
        studentId: outsider.localId,
        quantity: 1,
        reason: 'Prueba',
        operationId: crypto.randomUUID(),
      })
    ).status()
  ).toBe(403)
  // Automatic no-show settlement is idempotent on repeated snapshot loads.
  const walletId = hash(scope, studentId),
    holdId = hash(scope, studentId, 'past-class'),
    grantId = account.grants[0].id
  account.grants[0].reserved = 1
  await seed(`paymentAccounts/${walletId}`, { ...account, scope, studentId })
  await seed(`paymentReservations/${holdId}`, {
    id: holdId,
    scope,
    studentId,
    sourceId: 'past-class',
    date,
    startTime: '18:00',
    grantId,
    state: 'reserved',
    actorId: manager.localId,
    createdAt: Date.now(),
    endsAt: Date.now() - 1000,
  })
  for (let n = 0; n < 2; n++) {
    const settled = (await snapshot()).accounts[studentId]
    expect(settled.grants[0].used).toBe(1)
    expect(settled.grants[0].reserved).toBe(0)
  }
  // Manual refunds restore the original allowance, and repeated refunds are harmless.
  for (let n = 0; n < 2; n++)
    expect(
      (
        await post({
          action: 'refund',
          studentId,
          reservationId: holdId,
          reason: 'Reposición autorizada',
          operationId: crypto.randomUUID(),
        })
      ).ok()
    ).toBe(true)
  expect((await snapshot()).accounts[studentId].grants[0].used).toBe(0)
  // Active student view never inherits coordinator privileges from the same account.
  const limited = await (
    await request.get(`${endpoint}&view=student`, { headers: headers() })
  ).json()
  expect(limited.manager).toBe(false)
  expect(limited.students).toHaveLength(0)
  expect(
    (
      await request.post(`${endpoint}&view=student`, {
        headers: headers(),
        data: { action: 'settings', settings: config },
      })
    ).status()
  ).toBe(403)
  const teacher = await signup('teacher', true)
  await seed(`schoolMemberships/${schoolId}_${teacher.localId}`, {
    schoolId,
    userId: teacher.localId,
    role: 'teacher',
    roles: ['teacher'],
    status: 'active',
  })
  expect((await request.get(endpoint, { headers: headers(teacher) })).status()).toBe(403)
  expect(
    (
      await request.post(endpoint, {
        headers: headers(teacher),
        data: { action: 'settings', settings: config },
      })
    ).status()
  ).toBe(403)
  // Plans reserve first; their daily limit cannot be bypassed by a second request.
  expect(
    (await post({ action: 'settings', settings: { ...config, periodsEnabled: true } })).ok()
  ).toBe(true)
  const plan = (
    await (
      await post({
        action: 'product',
        product: {
          name: 'Mensual',
          mode: 'period',
          priceCents: 50000,
          months: 1,
          perDay: 1,
          perWeek: 2,
          perPeriod: 10,
        },
      })
    ).json()
  ).product
  const planOrder = (
    await (
      await post(
        {
          action: 'purchase',
          studentId,
          productId: plan.id,
          method: 'cash',
          operationId: crypto.randomUUID(),
        },
        athlete
      )
    ).json()
  ).id
  expect((await post({ action: 'review', orderId: planOrder, status: 'approved' })).ok()).toBe(true)
  const enrollPeriod = async (key: string, allowPackage = false) => {
    const id = `period-${key}-${suffix}`
    await seed(`schoolClassOccurrences/${id}`, {
      id,
      seriesId: id,
      schoolId,
      title: 'Clase plan',
      type: 'group',
      date,
      startTime: '16:00',
      endTime: '17:00',
      teacherIds: [manager.localId],
      studentIds: [],
      status: 'scheduled',
      timezone: 'America/Mazatlan',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return request.post(`/api/schools/${schoolId}/classes/${id}/students`, {
      headers: headers(),
      data: { studentIds: [studentId], allowPackage },
    })
  }
  expect((await enrollPeriod('one')).ok()).toBe(true)
  expect((await enrollPeriod('three')).ok()).toBe(true)
  const planAccount = (await snapshot()).accounts[studentId]
  expect(planAccount.grants.find((g: { id: string }) => g.id === planOrder).reserved).toBe(1)
  // The athlete's cancellation route releases the exact retained plan allowance.
  const cancelOwn = await request.post(`/api/schools/${schoolId}/reservations/cancel`, {
    headers: headers(athlete),
    data: { schoolClassId: `period-one-${suffix}` },
  })
  expect(cancelOwn.ok(), await cancelOwn.text()).toBe(true)
  expect(
    (await snapshot()).accounts[studentId].grants.find((g: { id: string }) => g.id === planOrder)
      .reserved
  ).toBe(0)
  const destinationId = `move-${suffix}`,
    destinationDate = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000)
      .toISOString()
      .slice(0, 10)
  await seed(`schoolClassOccurrences/${destinationId}`, {
    id: destinationId,
    seriesId: destinationId,
    schoolId,
    title: 'Destino',
    type: 'group',
    date: destinationDate,
    startTime: '17:00',
    endTime: '18:00',
    teacherIds: [manager.localId],
    studentIds: [],
    status: 'scheduled',
    timezone: 'America/Mazatlan',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  const moved = await request.post(`/api/schools/${schoolId}/agenda/reassign`, {
    headers: headers(),
    data: {
      schoolClassId: `period-three-${suffix}`,
      destinationSchoolClassId: destinationId,
      coachId: manager.localId,
      date: destinationDate,
      startTime: '17:00',
    },
  })
  expect(moved.ok(), await moved.text()).toBe(true)
  const movedAccount = (await snapshot()).accounts[studentId]
  expect(
    movedAccount.grants.reduce((sum: number, g: { reserved: number }) => sum + g.reserved, 0)
  ).toBe(1)
  expect(movedAccount.grants.find((g: { id: string }) => g.id === planOrder).reserved).toBe(1)
  // An independent coach can review a purchase made before the first booking.
  const personal = `/api/payments?coachId=${manager.localId}`
  expect(
    (
      await request.post(personal, {
        headers: headers(),
        data: { action: 'settings', settings: config },
      })
    ).ok()
  ).toBe(true)
  const personalProduct = (
    await (
      await request.post(personal, {
        headers: headers(),
        data: {
          action: 'product',
          product: { name: 'Personal', mode: 'classes', classes: 1, priceCents: 35000 },
        },
      })
    ).json()
  ).product
  expect(
    (
      await request.post(personal, {
        headers: headers(athlete),
        data: {
          action: 'purchase',
          studentId: athlete.localId,
          productId: personalProduct.id,
          method: 'cash',
          operationId: crypto.randomUUID(),
        },
      })
    ).ok()
  ).toBe(true)
  const personalData = await (await request.get(personal, { headers: headers() })).json()
  expect(
    personalData.students.some((student: { id: string }) => student.id === athlete.localId)
  ).toBe(true)
  expect(personalData.orders).toHaveLength(1)
  expect(
    (
      await post({ action: 'review', orderId: personalData.orders[0].id, status: 'approved' })
    ).status()
  ).toBe(409)
  // Review the actual mobile configuration and product form, not a mocked page.
  expect(
    (await request.post('/api/auth/otp/request', { data: { email: manager.email } })).ok()
  ).toBe(true)
  const otp = await (
    await fetch(`${root}/otpLoginCodes/${manager.email}`, {
      headers: { authorization: 'Bearer owner' },
    })
  ).json()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(
    `/auth/link?email=${encodeURIComponent(manager.email)}&token=${otp.fields.devLinkToken.stringValue}`
  )
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.waitForURL(/\/athlete\/(bookings|progress)$/)
  await page.evaluate((id) => localStorage.setItem('nadamas.schoolId', id), schoolId)
  await page.goto(`/school/payments?schoolId=${schoolId}`)
  await expect(page.getByRole('heading', { name: 'Pagos', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Configuración', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Configuración de pagos' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Pago por clase', { exact: true })).toBeChecked()
  for (const label of [
    'Horas para cancelar sin cargo',
    'Banco',
    'Titular de la cuenta',
    'Número de cuenta',
    'CLABE',
    'Referencia',
  ]) {
    const field = dialog.getByLabel(label)
    await expect(field).toHaveCSS('border-left-width', '1px')
    await expect(field).toHaveCSS('border-right-width', '1px')
    await field.focus()
    await expect(field).toHaveCSS('outline-style', 'none')
  }

  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true
  )
  await expect(dialog.getByRole('button', { name: 'Guardar', exact: true })).toBeInViewport({
    ratio: 1,
  })
  await page.screenshot({ path: '/tmp/nadamas-payments-mobile.png', fullPage: true })
  await dialog.getByLabel('Banco', { exact: true }).fill('Banco de prueba')
  await dialog.getByLabel('Titular de la cuenta').fill('Escuela pagos')
  await dialog.getByLabel('CLABE', { exact: true }).fill('012345678901234567')
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect((await snapshot()).settings.transferDetails.clabe).toBe('012345678901234567')
  await expect(page.getByLabel('Buscar alumno')).toBeVisible()
  await page.getByLabel('Buscar alumno').fill('sin coincidencias')
  await expect(page.getByText('No hay alumnos que coincidan con la búsqueda.')).toBeVisible()
  await page.getByLabel('Buscar alumno').fill('')
  await expect(page.getByRole('heading', { name: 'Planes', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Planes', exact: true }).click()
  await expect(page.getByLabel('Buscar alumno')).toHaveCount(0)
  await page.getByRole('button', { name: 'Crear', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Crear paquete o plan' })).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Crear paquete o plan' })
    .getByLabel('Nombre', { exact: true })
    .fill('Mensual dos clases por semana')
  await page
    .getByRole('dialog', { name: 'Crear paquete o plan' })
    .getByRole('radio', { name: 'Plan por periodo' })
    .check()
  await expect(
    page
      .getByRole('dialog', { name: 'Crear paquete o plan' })
      .getByRole('button', { name: 'Crear', exact: true })
  ).toBeInViewport({ ratio: 1 })
  const productDialog = page.getByRole('dialog', { name: 'Crear paquete o plan' })
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    for (const mode of ['classes', 'period']) {
      await productDialog
        .getByRole('radio', { name: mode === 'classes' ? 'Paquete de clases' : 'Plan por periodo' })
        .check()
      const bounds = await productDialog.evaluate((element) => {
        const form = element.querySelector('form')?.getBoundingClientRect()
        if (!form) return false
        return Array.from(element.querySelectorAll('input:not([type=radio]), select')).every(
          (field) => {
            const rect = field.getBoundingClientRect()
            const style = getComputedStyle(field)
            return (
              rect.left >= form.left - 1 &&
              rect.right <= form.right + 1 &&
              Number.parseFloat(style.borderLeftWidth) >= 1 &&
              Number.parseFloat(style.borderRightWidth) >= 1 &&
              style.borderLeftStyle === 'solid' &&
              style.borderLeftColor !== 'rgba(0, 0, 0, 0)'
            )
          }
        )
      })
      expect(bounds, `Fields must fit the form at ${width}px in ${mode} mode`).toBe(true)
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await productDialog.getByLabel('Nombre', { exact: true }).focus()
  await expect(productDialog).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: '/tmp/nadamas-payments-plan-mobile.png', animations: 'disabled' })
  await page
    .getByRole('dialog', { name: 'Crear paquete o plan' })
    .getByRole('button', { name: 'Cerrar modal', exact: true })
    .click()
  await page.goto(`/athlete/payments?schoolId=${schoolId}`)
  await expect(page.getByRole('heading', { name: 'Pagos', exact: true })).toBeVisible()
  await expect(
    page.getByText('Todavía no tienes un perfil de alumno vinculado en este espacio.')
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Configuración', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Movimientos', exact: true })).toHaveCount(0)
  await page.evaluate((id) => localStorage.setItem('nadamas.coachSelection', id), schoolId)
  await page.goto(`/coach/payments?schoolId=${schoolId}`)
  await expect(
    page.getByText('Los pagos de la escuela solo están disponibles en Modo Coordinador.')
  ).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Pagos', exact: true })
  ).toHaveCount(0)
  // Student profiles use compact badges and switch between isolated balances.
  await seed(`schoolStudents/${schoolId}_child`, {
    id: `${schoolId}_child`,
    schoolId,
    name: 'Perfil adicional',
    additionalProfileId: `child-${suffix}`,
    studentUserId: athlete.localId,
    status: 'active',
    guardianIds: [athlete.localId],
    managerIds: [athlete.localId],
  })
  expect(
    (await request.post('/api/auth/otp/request', { data: { email: athlete.email } })).ok()
  ).toBe(true)
  const athleteOtp = await (
    await fetch(`${root}/otpLoginCodes/${athlete.email}`, {
      headers: { authorization: 'Bearer owner' },
    })
  ).json()
  await page.goto(
    `/auth/link?email=${encodeURIComponent(athlete.email)}&token=${athleteOtp.fields.devLinkToken.stringValue}`
  )
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.waitForURL(/\/athlete\/(bookings|progress)$/)
  await page.goto(`/athlete/payments?schoolId=${schoolId}`)
  const currentSettings = (await snapshot()).settings
  expect(
    (
      await post({
        action: 'settings',
        settings: { ...currentSettings, allowBookingWithoutBalance: true },
      })
    ).ok()
  ).toBe(true)
  const pendingRequest = {
    studentId: `${schoolId}_child`,
    preferredTeacherId: manager.localId,
    preferredDays: [0],
    startDate: '2026-12-20',
    preferredStartTime: '12:00',
    preferredEndTime: '13:00',
    type: 'individual',
  }
  expect(
    (
      await post({
        action: 'settings',
        settings: { ...currentSettings, allowBookingWithoutBalance: false },
      })
    ).ok()
  ).toBe(true)
  const blockedRequest = await request.post(`/api/schools/${schoolId}/class-requests`, {
    headers: headers(athlete),
    data: pendingRequest,
  })
  expect(blockedRequest.status(), await blockedRequest.text()).toBe(409)
  expect((await blockedRequest.json()).code).toBe('payment_required')
  expect(
    (
      await post({
        action: 'settings',
        settings: { ...currentSettings, allowBookingWithoutBalance: true },
      })
    ).ok()
  ).toBe(true)
  const allowedRequest = await request.post(`/api/schools/${schoolId}/class-requests`, {
    headers: headers(athlete),
    data: pendingRequest,
  })
  expect(allowedRequest.ok(), await allowedRequest.text()).toBe(true)
  const unpaidClassId = `unpaid-${suffix}`
  await seed(`schoolClassOccurrences/${unpaidClassId}`, {
    id: unpaidClassId,
    schoolId,
    date: '2026-12-20',
    startTime: '10:00',
    endTime: '11:00',
    teacherIds: [manager.localId],
    studentIds: [],
    status: 'scheduled',
    type: 'group',
    capacity: 10,
    timezone: 'America/Mazatlan',
  })
  const unpaidEnrollment = await request.post(
    `/api/schools/${schoolId}/classes/${unpaidClassId}/students`,
    {
      headers: headers(),
      data: { studentIds: [`${schoolId}_child`] },
    }
  )
  expect(unpaidEnrollment.ok(), await unpaidEnrollment.text()).toBe(true)
  expect((await snapshot()).settings.allowBookingWithoutBalance).toBe(true)
  const profiles = page.getByRole('region', { name: 'Elegir perfil de alumno' })
  await expect(
    profiles.getByRole('button', { name: 'Alumno pagos (yo)', exact: true })
  ).toBeVisible()
  await profiles.getByRole('button', { name: 'Perfil adicional', exact: true }).click()
  await expect(page.getByText('0 clases disponibles', { exact: true })).toBeVisible()
  await expect(
    profiles.getByRole('button', { name: 'Perfil adicional', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Alumno', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: '/tmp/nadamas-payments-profile-badges.png', fullPage: true })
  const buyClasses = page.getByRole('button', { name: 'Conseguir más clases', exact: true })
  await expect(buyClasses).toBeInViewport({ ratio: 1 })
  await buyClasses.click()
  await expect(page.getByRole('heading', { name: 'Planes', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Adquirir', exact: true }).first().click()
  const purchaseDialog = page.getByRole('dialog', { name: 'Adquirir clases' })
  await expect(
    purchaseDialog.getByRole('radio', { name: 'Transferencia', exact: true })
  ).toBeChecked()
  await expect(purchaseDialog.getByLabel('Comprobante', { exact: true })).toHaveCSS(
    'border-left-width',
    '1px'
  )
  await purchaseDialog.getByRole('radio', { name: 'Efectivo', exact: true }).check()
  await expect(purchaseDialog.getByLabel('Comprobante', { exact: true })).toHaveCount(0)
  await expect(
    purchaseDialog.getByText('El responsable confirmará cuando reciba el efectivo.')
  ).toBeVisible()
  await expect(
    purchaseDialog.getByRole('button', { name: 'Pago en línea · Próximamente' })
  ).toBeDisabled()
  await purchaseDialog.getByRole('radio', { name: 'Transferencia', exact: true }).check()
  await expect(purchaseDialog.getByLabel('Comprobante', { exact: true })).toBeVisible()
  await purchaseDialog.getByLabel('Comprobante', { exact: true }).setInputFiles({
    name: 'comprobante.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  })
  await purchaseDialog.getByRole('button', { name: 'Enviar para confirmación' }).click()
  await expect(purchaseDialog.getByText(/El PDF supera los 2 MB/)).toBeVisible()
  const largeImage = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1400
    canvas.height = 1400
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Missing canvas')
    const image = context.createImageData(1400, 1400)
    let random = 123456789
    for (let i = 0; i < image.data.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0
        image.data[i + channel] = random >>> 24
      }
      image.data[i + 3] = 255
    }
    context.putImageData(image, 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const originalImage = Buffer.from(largeImage, 'base64')
  expect(originalImage.length).toBeGreaterThan(2 * 1024 * 1024)
  await purchaseDialog.getByLabel('Comprobante', { exact: true }).setInputFiles({
    name: 'comprobante-grande.png',
    mimeType: 'image/png',
    buffer: originalImage,
  })
  await expect(
    purchaseDialog.getByAltText('Vista previa del comprobante seleccionado')
  ).toBeVisible()
  await purchaseDialog.getByRole('button', { name: 'Ver comprobante completo' }).click()
  const previewDialog = page.getByRole('dialog', { name: 'Comprobante completo' })
  await expect(previewDialog.getByAltText('Comprobante completo')).toBeVisible()
  await previewDialog.getByRole('button', { name: 'Cerrar modal', exact: true }).click()
  await expect(previewDialog).not.toBeVisible()
  await expect(purchaseDialog).toBeVisible()
  await purchaseDialog.getByRole('button', { name: 'Enviar para confirmación' }).click()
  await expect(purchaseDialog).not.toBeVisible()
  const imageOrder = (await snapshot()).orders.find(
    (order: { studentId: string; receiptType?: string }) =>
      order.studentId === `${schoolId}_child` && order.receiptType === 'image/jpeg'
  )
  expect(imageOrder).toBeTruthy()
  const optimizedReceipt = await request.get(
    `/api/payments/receipts?schoolId=${schoolId}&orderId=${imageOrder.id}`,
    { headers: headers(athlete) }
  )
  expect(optimizedReceipt.ok()).toBe(true)
  expect((await optimizedReceipt.body()).length).toBeLessThanOrEqual(2 * 1024 * 1024)

  await expect(
    page.getByText('Pago registrado. Espera la confirmación para activar tu saldo o plan.')
  ).toBeVisible()
})
