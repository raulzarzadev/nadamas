import { expect, test } from '@playwright/test'
import { paletteFromHex } from '../lib/school-theme'

test('el coordinador personaliza portada, color y secciones', async ({ page, request }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere emuladores de Firebase')
  const stamp = Date.now()
  const email = `school-appearance-${stamp}@test.com`
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  let schoolId: string | undefined
  let uid: string | undefined
  let slug: string | undefined
  const uploaded: string[] = []
  try {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Aceptar política y continuar' }).click()
    await page.getByLabel('Correo', { exact: true }).fill(email)
    await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.includes('/login'))
    await page.goto('/school/create')
    await page.getByLabel('Nombre de la escuela').fill(`Apariencia ${stamp}`)
    const image = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 200
      const context = canvas.getContext('2d')
      if (!context) throw new Error('CANVAS_UNAVAILABLE')
      context.fillStyle = '#ff0000'
      context.fillRect(0, 0, 400, 200)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    const file = { name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') }
    await page.locator('input[type=file]').setInputFiles(file)
    await page.getByRole('button', { name: 'Usar imagen', exact: true }).click()
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/schools') && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Crear escuela', exact: true }).click()
    const { school } = await (await created).json()
    schoolId = school.id
    uid = school.directorId
    slug = school.slug
    uploaded.push(school.logoUrl)

    await page.goto('/school/settings')
    await expect(page.getByRole('heading', { name: 'Foto de portada' })).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByRole('heading', { name: 'Para completar tu página' })).toBeVisible()
    await expect(page.getByText('Agrega una foto de portada', { exact: true })).toBeVisible()
    await expect(page.getByText('Sube algunas fotos a la galería', { exact: true })).toBeVisible()
    await expect(page.getByText('0 de 24', { exact: true })).toBeVisible()

    await page.getByLabel('Subir foto de portada').setInputFiles(file)
    await expect(page.getByAltText('Portada actual')).toBeVisible({ timeout: 30000 })
    await page.reload()
    await expect(page.getByAltText('Portada actual')).toBeVisible({ timeout: 30000 })
    await expect(page.getByText('Agrega una foto de portada', { exact: true })).toHaveCount(0)

    const colorSaved = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/schools/${schoolId}/home-settings`) &&
        response.request().method() === 'PATCH'
    )
    await page.getByLabel('Color propio').fill('#7c3aed')
    expect((await colorSaved).ok()).toBe(true)
    await page.goto(`/school/${slug}`)
    const primary = await page.evaluate(() =>
      getComputedStyle(document.querySelector('[style*="--school-primary"]') as Element)
        .getPropertyValue('--school-primary')
        .trim()
    )
    expect(primary.toLowerCase()).toBe(paletteFromHex('#7c3aed').primary.toLowerCase())

    await page.goto('/school/settings')
    await expect(page.getByRole('heading', { name: 'Secciones de tu página' })).toBeVisible({
      timeout: 30000,
    })
    const patch = () =>
      page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/schools/${schoolId}/home-settings`) &&
          response.request().method() === 'PATCH'
      )
    let saved = patch()
    await page.getByRole('switch', { name: 'Mostrar Galería' }).click()
    expect((await saved).ok()).toBe(true)
    saved = patch()
    await page.getByRole('button', { name: 'Subir Contacto', exact: true }).click()
    expect((await saved).ok()).toBe(true)
    const doc = await (
      await fetch(`${root}/schools/${schoolId}`, { headers: { authorization: 'Bearer owner' } })
    ).json()
    const sections = doc.fields.homeSections.arrayValue.values.map(
      (value: { stringValue: string }) => value.stringValue
    )
    expect(sections).toEqual(['contacts', 'events'])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
    expect((await request.get(`/school/${slug}`)).ok()).toBe(true)
  } finally {
    for (const url of uploaded.filter(Boolean)) {
      const parsed = new URL(url)
      await fetch(`${parsed.origin}${parsed.pathname}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
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
