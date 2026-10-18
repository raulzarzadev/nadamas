import { expect, test } from '@playwright/test'

test('entreno: crear ciclos, validar fechas y conservar la planificación', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login?intent=coach')
  await page.getByRole('button', { name: 'Aceptar política y continuar' }).click()
  await page.getByLabel('Correo', { exact: true }).fill(`training-${crypto.randomUUID()}@test.com`)
  await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL('**/coach/agenda')
  await page.getByRole('link', { name: 'Entreno', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Entreno', exact: true })).toBeVisible({
    timeout: 30000,
  })
  const chooseDate = async (label: string, value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    const group = page.getByRole('group', { name: label, exact: true })
    if (!(await group.isVisible())) {
      await page
        .getByRole('button', {
          name: label.startsWith('Fecha de inicio')
            ? 'Editar fecha de inicio'
            : /^(Agregar fecha final|Editar fecha final)$/,
          exact: true,
        })
        .click()
    }
    await group.getByRole('button', { name: /^Año:/ }).click()
    while (!(await group.getByRole('button', { name: String(year), exact: true }).count())) {
      await group.getByRole('button', { name: 'Años siguientes', exact: true }).click()
    }
    await group.getByRole('button', { name: String(year), exact: true }).click()
    await group.getByRole('button', { name: /^Mes:/ }).click()
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ]
    await group.getByRole('button', { name: months[month - 1], exact: true }).click()
    await group.getByRole('button', { name: /^Día:/ }).click()
    await group.getByRole('button', { name: String(day), exact: true }).click()
    const dateDialog = page.getByRole('dialog', { name: /^Editar fecha (de inicio|final)$/ })
    if (await dateDialog.isVisible()) {
      await expect(dateDialog.getByRole('group')).toHaveCount(1)
      await dateDialog.getByRole('button', { name: 'Listo', exact: true }).click()
    }
  }
  const setCycleName = async (name: string) => {
    if (!(await page.getByLabel('Nombre', { exact: true }).isVisible()))
      await page.getByRole('button', { name: 'Editar nombre del macrociclo', exact: true }).click()
    await page.getByLabel('Nombre', { exact: true }).fill(name)
    const nameDialog = page.getByRole('dialog', { name: 'Editar ciclo', exact: true })
    if (await nameDialog.isVisible())
      await nameDialog.getByRole('button', { name: 'Listo', exact: true }).click()
  }
  const create = async (name: string, start: string, end: string) => {
    const macroEditor = page.getByRole('button', {
      name: 'Editar nombre del macrociclo',
      exact: true,
    })
    const isMacro = await macroEditor.isVisible()
    if (isMacro) {
      await macroEditor.click()
      await page.getByLabel('Nombre', { exact: true }).fill(name)
    } else await setCycleName(name)
    await chooseDate('Fecha de inicio (opcional)', start)
    await chooseDate('Fecha final (opcional)', end)
    if (isMacro)
      await page
        .getByRole('dialog', { name: 'Editar ciclo', exact: true })
        .getByRole('button', { name: 'Listo', exact: true })
        .click()
    await page.getByRole('button', { name: 'Guardar ciclo', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Crear mi primer macrociclo' }).click()
  await expect(page.getByRole('heading', { name: 'Temporada 1', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Temporada 1', exact: true })).toBeVisible({
    timeout: 30000,
  })
  await page.getByRole('button', { name: 'Temporada 1', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Nuevo mesociclo', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar nombre', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  const saveField = async () => {
    await page.getByRole('button', { name: 'Guardar ciclo', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Editar nombre', exact: true }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Temporada de invierno')
  await saveField()
  await expect(
    page.getByRole('heading', { name: 'Temporada de invierno', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Editar fechas', exact: true }).click()
  const startDate = page.getByRole('group', { name: 'Fecha de inicio (opcional)', exact: true })
  await startDate.getByRole('button', { name: 'Hoy', exact: true }).click()
  const today = await page.evaluate(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
  await expect(startDate.locator('input')).toHaveValue(today)
  await chooseDate('Fecha de inicio (opcional)', '2026-10-01')
  await chooseDate('Fecha final (opcional)', '2026-12-31')
  await saveField()
  await page.getByRole('button', { name: 'Editar objetivo', exact: true }).click()
  await page.getByLabel('Objetivo', { exact: true }).fill('Nadar más rápido')
  await saveField()
  await expect(page.getByText('Nadar más rápido', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nuevo mesociclo', exact: true }).click()
  await create('Base aeróbica', '2026-10-01', '2026-10-31')
  await page.getByRole('button', { name: 'Nuevo microciclo', exact: true }).click()
  await page.getByRole('button', { name: 'Dibujar barra', exact: true }).click()
  const timeline = page.getByRole('group', { name: 'Línea de tiempo editable', exact: true })
  const track = await timeline.boundingBox()
  if (!track) throw new Error('TIMELINE_NOT_VISIBLE')
  await page.mouse.move(track.x + track.width * 0.1, track.y + track.height / 2)
  await page.mouse.down()
  await page.mouse.move(track.x + track.width * 0.4, track.y + track.height / 2, { steps: 8 })
  await page.mouse.up()
  const rangeStart = page.getByRole('slider', { name: 'Inicio del periodo', exact: true })
  const beforeMove = Number(await rangeStart.getAttribute('aria-valuenow'))
  await page.getByRole('button', { name: 'Mover periodo', exact: true }).press('ArrowRight')
  await expect(rangeStart).toHaveAttribute('aria-valuenow', String(beforeMove + 1))
  await rangeStart.press('Home')
  await expect(
    page.getByRole('group', { name: 'Fecha de inicio (opcional)', exact: true }).locator('input')
  ).toHaveValue('2026-10-01')
  await page.getByLabel('Nombre', { exact: true }).fill('Semana 1')
  const microStart = page.getByRole('group', { name: 'Fecha de inicio (opcional)', exact: true })
  await expect(
    page.getByText('Las fechas deben quedar dentro de este periodo.', { exact: false })
  ).toBeVisible()
  await microStart.getByRole('button', { name: /^Mes:/ }).click()
  await expect(microStart.getByRole('button', { name: 'Sep', exact: true })).toBeDisabled()
  await expect(microStart.getByRole('button', { name: 'Nov', exact: true })).toBeDisabled()
  await microStart.getByRole('button', { name: 'Oct', exact: true }).click()
  await page
    .getByLabel('Sesiones y trabajo de la semana (opcional)', { exact: true })
    .fill('Lunes: 200 m suaves + 4 × 50 m técnica')
  await create('Semana 1', '2026-10-01', '2026-10-07')
  await expect(
    page.getByText('Lunes: 200 m suaves + 4 × 50 m técnica', { exact: true })
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await page.reload()
  await page.getByRole('button', { name: 'Temporada de invierno', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Barras de mesociclos' })).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Barras de mesociclos' })
      .getByText('Base aeróbica', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Editar nombre de Base aeróbica', exact: true })
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+ Agregar mesociclo', exact: true })).toHaveCount(
    0
  )
  await page.screenshot({ path: '/tmp/nadamas-training-readonly.png', fullPage: true })
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Editar nombre de Base aeróbica', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Editar ciclo', exact: true })
    .getByLabel('Nombre', { exact: true })
    .fill('Base técnica')
  await page
    .getByRole('dialog', { name: 'Editar ciclo', exact: true })
    .getByRole('button', { name: 'Listo', exact: true })
    .click()
  await page.getByRole('button', { name: 'Listo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Temporada de invierno', exact: true }).click()
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Editar nombre de Base técnica', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: '+ Agregar mesociclo', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Editar nombre de Mesociclo 2', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Barras de mesociclos' }).getByText('Mesociclo 2')
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Editar', exact: true }).click()

  await expect(page.getByRole('region', { name: 'Barras de mesociclos' })).toBeVisible()
  await page.getByRole('button', { name: '+ Agregar mesociclo', exact: true }).click()
  await page.getByRole('button', { name: 'Editar nombre de Mesociclo 2', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Editar ciclo', exact: true })
    .getByLabel('Nombre', { exact: true })
    .fill('Bloque final')
  await page
    .getByRole('dialog', { name: 'Editar ciclo', exact: true })
    .getByRole('button', { name: 'Listo', exact: true })
    .click()
  const reorder = page.getByRole('button', { name: 'Reordenar mesociclo 2', exact: true })
  await reorder.press('Space')
  await expect(reorder).toHaveAttribute('aria-pressed', 'true')
  await reorder.press('ArrowUp')
  // dnd-kit resolves the drop target after the keyboard move animation.
  await page.waitForTimeout(300)
  await reorder.press('Space')
  await expect(page.getByRole('button', { name: /^Editar nombre de / }).first()).toHaveAttribute(
    'aria-label',
    'Editar nombre de Bloque final'
  )
  const macroTrack = await page
    .getByRole('group', { name: 'Barra Bloque final', exact: true })
    .getByRole('group', { name: 'Línea de tiempo editable', exact: true })
    .boundingBox()
  if (!macroTrack) throw new Error('MACRO_TIMELINE_NOT_VISIBLE')
  await page.mouse.move(macroTrack.x + macroTrack.width * 0.6, macroTrack.y + macroTrack.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    macroTrack.x + macroTrack.width * 0.8,
    macroTrack.y + macroTrack.height / 2,
    { steps: 8 }
  )
  await page.mouse.up()
  await page.getByRole('button', { name: 'Detalles de Bloque final', exact: true }).click()
  const microSection = page.getByRole('region', { name: 'Barras de microciclos', exact: true })
  await microSection.getByRole('button', { name: '+ Agregar microciclo', exact: true }).click()
  await expect(
    microSection.getByRole('group', { name: 'Barra Microciclo 1', exact: true })
  ).toBeVisible()
  const microDetails = microSection.getByRole('button', {
    name: 'Detalles de Microciclo 1',
    exact: true,
  })
  await microDetails.click()
  await expect(microDetails).toHaveAttribute('aria-expanded', 'true')

  await page.getByRole('button', { name: 'Listo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Mesociclos', exact: true })
      .getByRole('button', { name: /Bloque final/ })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await page.getByRole('button', { name: 'Editar nombre de Bloque final', exact: true }).click()
  await page.getByRole('button', { name: 'Eliminar mesociclo Bloque final', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Eliminar mesociclo', exact: true })).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Eliminar mesociclo', exact: true })
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Eliminar mesociclo Bloque final', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Eliminar mesociclo Bloque final', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Eliminar mesociclo', exact: true })
    .getByRole('button', { name: 'Eliminar mesociclo', exact: true })
    .click()
  await page.getByRole('button', { name: 'Listo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Mesociclos', exact: true })
      .getByRole('button', { name: /Bloque final/ })
  ).toHaveCount(0)
  await page
    .getByRole('region', { name: 'Mesociclos', exact: true })
    .getByRole('button', { name: /Base técnica/ })
    .click()
  await page.getByRole('button', { name: /Semana 1/ }).click()
  await expect(
    page.getByText('Lunes: 200 m suaves + 4 × 50 m técnica', { exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await page.getByRole('button', { name: 'Editar nombre', exact: true }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Semana técnica')
  await page.getByRole('button', { name: 'Guardar ciclo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Semana técnica', exact: true })).toBeVisible()
  await page.screenshot({ path: '/tmp/nadamas-training-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await page.getByRole('button', { name: 'Eliminar ciclo', exact: true }).click()
  await expect(page.getByText('Todavía no hay microciclos.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Nuevo macrociclo', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Temporada 2', exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Editar fecha final del macrociclo', exact: true })
  ).not.toHaveText('Sin fecha')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Temporada 2', exact: true })).toBeVisible({
    timeout: 30000,
  })
  await page.getByRole('button', { name: 'Temporada de invierno', exact: true }).click()
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await expect(page.getByText(/Se eliminará toda la temporada, incluido 1 ciclo/)).toBeVisible()
  await page.getByRole('button', { name: 'Eliminar ciclo', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Temporada de invierno', exact: true })
  ).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Temporada 2', exact: true })).toBeVisible({
    timeout: 30000,
  })
  await expect(
    page.getByRole('button', { name: 'Temporada de invierno', exact: true })
  ).toHaveCount(0)
})
