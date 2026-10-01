import { expect, test } from '@playwright/test'

test('recorta y sube el logo al crear y editar una escuela', async ({ page, request }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 320, height: 568 })
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere emuladores de Firebase')
  const email = `school-logo-${Date.now()}@test.com`
  const schoolName = `Logo ${Date.now()}`
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  let schoolId: string | undefined
  let uid: string | undefined
  const uploaded: string[] = []
  try {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Aceptar política y continuar' }).click()
    await page.getByLabel('Correo', { exact: true }).fill(email)
    await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.includes('/login'))
    await page.goto('/school/create')
    await page.getByLabel('Nombre de la escuela').fill(schoolName)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
    const image = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 200
      const context = canvas.getContext('2d')
      if (!context) throw new Error('CANVAS_UNAVAILABLE')
      context.fillStyle = '#ff0000'
      context.fillRect(0, 0, 200, 200)
      context.fillStyle = '#0000ff'
      context.fillRect(200, 0, 200, 200)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    const file = { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') }
    await page.locator('input[type=file]').setInputFiles(file)
    await expect(page.getByRole('button', { name: 'Crear escuela', exact: true })).toBeDisabled()
    const dragImage = async (direction: number) => {
      const frame = await page.locator('canvas').boundingBox()
      if (!frame) throw new Error('CROP_FRAME_MISSING')
      await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2)
      await page.mouse.down()
      await page.mouse.move(
        frame.x + frame.width / 2 + (direction * frame.width) / 3,
        frame.y + frame.height / 2,
        { steps: 8 }
      )
      await page.mouse.up()
    }
    await dragImage(-1)
    await expect
      .poll(() =>
        page
          .locator('canvas')
          .evaluate((canvas: HTMLCanvasElement) =>
            Array.from(canvas.getContext('2d')?.getImageData(400, 200, 1, 1).data || [])
          )
      )
      .toEqual([0, 0, 255, 255])
    await page.getByRole('button', { name: 'Usar imagen', exact: true }).click()
    await page.route('**/api/schools', async (route) => {
      if (route.request().method() === 'POST')
        await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })
    const createdResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/schools') && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Crear escuela', exact: true }).click()
    await expect(page.getByRole('button', { name: /Subiendo logo|Creando escuela/ })).toBeDisabled()
    const response = await createdResponse
    expect(response.ok()).toBe(true)
    const { school } = await response.json()
    schoolId = school.id
    uid = school.directorId
    uploaded.push(school.logoUrl)
    const logo = await request.get(school.logoUrl)
    expect(logo.ok()).toBe(true)
    expect(logo.headers()['content-type']).toBe('image/png')
    const dimensions = await page.evaluate(async (url) => {
      const image = await createImageBitmap(await (await fetch(url)).blob())
      const size = [image.width, image.height]
      image.close()
      return size
    }, school.logoUrl)
    expect(dimensions).toEqual([512, 512])
    await page.goto(`/school/classes?schoolId=${schoolId}`)
    await page.getByRole('button', { name: 'Agregar o quitar horas', exact: true }).click()
    const nextWeek = page
      .getByRole('dialog', { name: 'Editar horas' })
      .getByRole('button', { name: 'Semana siguiente', exact: true })
    const dialogBounds = await page
      .getByRole('dialog', { name: 'Editar horas' })
      .locator('div')
      .first()
      .boundingBox()
    const nextBounds = await nextWeek.boundingBox()
    expect(dialogBounds).not.toBeNull()
    expect(nextBounds).not.toBeNull()
    if (dialogBounds && nextBounds)
      expect(nextBounds.x + nextBounds.width).toBeLessThanOrEqual(
        dialogBounds.x + dialogBounds.width
      )
    await nextWeek.click()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.goto('/school/students')
    await page.getByRole('button', { name: 'Agregar alumno', exact: true }).click()
    const studentPanel = page.getByRole('dialog').locator(':scope > div').first()
    const studentBounds = await studentPanel.boundingBox()
    expect(studentBounds).not.toBeNull()
    if (studentBounds) {
      expect(studentBounds.y).toBeGreaterThanOrEqual(0)
      expect(studentBounds.y + studentBounds.height).toBeLessThanOrEqual(568)
    }
    await page.getByRole('button', { name: 'Guardar alumno', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Guardar alumno', exact: true })).toBeInViewport()
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click()

    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    await page.locator('input[type=file]').setInputFiles(file)
    await dragImage(1)
    await page.getByRole('button', { name: 'Usar imagen', exact: true }).click()
    const updatedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/schools/${schoolId}`) &&
        response.request().method() === 'PATCH'
    )
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    const updated = await updatedResponse
    expect(updated.ok()).toBe(true)
    const { school: edited } = await updated.json()
    uploaded.push(edited.logoUrl)
    expect(edited.logoUrl).not.toBe(school.logoUrl)
    await expect(page.getByRole('heading', { name: 'Editar escuela', exact: true })).toHaveCount(0)
  } finally {
    for (const url of uploaded) {
      const parsed = new URL(url)
      await fetch(`${parsed.origin}${parsed.pathname}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
    }
    if (schoolId && !uid) {
      const response = await fetch(`${root}/schools/${schoolId}`)
      uid = (await response.json()).fields?.directorId?.stringValue
    }
    for (const path of [
      `otpLoginCodes/${encodeURIComponent(email)}`,
      ...(schoolId ? [`schools/${schoolId}`, `schoolAgendaUpdates/${schoolId}`] : []),
      ...(uid
        ? [
            `users/${uid}`,
            `schoolMemberships/${schoolId}_${uid}`,
            `schoolProfiles/${schoolId}_${uid}`,
          ]
        : []),
    ]) {
      await fetch(`${root}/${path}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
    }
  }
})
