import { expect, test } from '@playwright/test'

test('create macro wizard saves the goal and optional three-phase template only on completion', async ({
  page,
}) => {
  test.setTimeout(60000)
  page.setDefaultTimeout(10000)
  await page.setViewportSize({ width: 320, height: 640 })
  const goal = `Preparar competencia ${crypto.randomUUID()}`
  await page.goto('/login?intent=coach')
  await page.getByRole('button', { name: 'Aceptar política y continuar' }).click()
  await page
    .getByLabel('Correo', { exact: true })
    .fill(`macro-wizard-${crypto.randomUUID()}@test.com`)
  await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL('**/coach/agenda')
  await page.setViewportSize({ width: 1440, height: 900 })
  const sidebar = page.locator('[data-app-sidebar]')
  await expect(sidebar).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Entreno', exact: true })).toBeVisible()
  const contentBounds = await page.locator('main').boundingBox()
  expect(contentBounds?.x).toBeGreaterThanOrEqual(224)
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal', exact: true })
  ).toHaveCount(1)
  await page.setViewportSize({ width: 722, height: 559 })
  await expect(sidebar).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal', exact: true })
  ).toHaveCount(1)
  await page.setViewportSize({ width: 320, height: 640 })
  await expect(sidebar).not.toBeVisible()
  await expect(page.locator('[data-app-tabbar]')).toBeVisible()

  await page.getByRole('link', { name: 'Entreno', exact: true }).click()
  await page.getByRole('button', { name: /Crear mi primer (MACRO-ciclo|macrociclo)/i }).click()
  const wizard = page.getByRole('dialog', { name: 'Crear MACRO-ciclo', exact: true })
  await expect(wizard.getByRole('heading', { name: 'Fechas de la temporada' })).toBeVisible()
  await wizard.getByRole('checkbox', { name: 'Lun', exact: true }).check()
  await wizard.getByRole('checkbox', { name: 'Mié', exact: true }).check()
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
  await wizard.getByLabel('Título de la competencia', { exact: true }).fill(goal)
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(wizard.getByRole('img')).toHaveCount(2)
  await wizard
    .getByRole('checkbox', { name: 'Crear machote de 3 mesociclos y 3 microciclos por mesociclo' })
    .check()
  await expect(
    wizard.getByRole('img', { name: 'Vista previa: 3 mesociclos con 3 microciclos cada uno' })
  ).toBeVisible()
  await wizard.getByRole('button', { name: '2. Competencia', exact: true }).click()
  await expect(wizard.getByLabel('Título de la competencia', { exact: true })).toHaveValue(goal)
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(
    wizard.getByRole('checkbox', {
      name: 'Crear machote de 3 mesociclos y 3 microciclos por mesociclo',
    })
  ).toBeChecked()
  await wizard
    .getByRole('checkbox', { name: 'Crear machote de 4 mesociclos y 4 microciclos por mesociclo' })
    .check()
  await expect(
    wizard.getByRole('checkbox', {
      name: 'Crear machote de 3 mesociclos y 3 microciclos por mesociclo',
    })
  ).not.toBeChecked()
  await expect(
    wizard.getByRole('img', { name: 'Vista previa: 4 mesociclos con 4 microciclos cada uno' })
  ).toBeVisible()
  await expect(
    wizard.getByRole('button', { name: 'Crear MACRO-ciclo', exact: true })
  ).toBeInViewport({ ratio: 1 })
  await wizard.getByRole('button', { name: 'Crear MACRO-ciclo', exact: true }).click()
  await expect(wizard).not.toBeVisible()
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const response = await fetch(`${root}/trainingPlans?pageSize=1000`, {
    headers: { authorization: 'Bearer owner' },
  })
  const data = await response.json()
  const stored = data.documents.find(
    (doc: {
      fields: {
        cycles: {
          arrayValue: {
            values: Array<{ mapValue: { fields: { title: { stringValue: string } } } }>
          }
        }
      }
    }) => doc.fields.cycles.arrayValue.values[0].mapValue.fields.title.stringValue === goal
  )
  expect(stored).toBeTruthy()
  expect(stored.fields.cycles.arrayValue.values).toHaveLength(21)
  const savedCycles = stored.fields.cycles.arrayValue.values
  const sessions: string[] = []
  for (const cycle of savedCycles) {
    if (cycle.mapValue.fields.type.stringValue !== 'micro') continue
    for (const date of cycle.mapValue.fields.objectiveDates.arrayValue.values || [])
      sessions.push(date.stringValue)
  }
  const expected: string[] = []
  const first = Date.parse(`${savedCycles[0].mapValue.fields.startDate.stringValue}T00:00:00Z`)
  const last = Date.parse(`${savedCycles[0].mapValue.fields.endDate.stringValue}T00:00:00Z`)
  for (let date = first; date <= last; date += 86400000) {
    if ([1, 3].includes(new Date(date).getUTCDay()))
      expected.push(new Date(date).toISOString().slice(0, 10))
  }
  expect(sessions.sort()).toEqual(expected)

  await page.reload()
  await expect(page.getByRole('button', { name: goal, exact: true })).toBeVisible()
  await page.getByRole('button', { name: goal, exact: true }).click()
  await page.getByRole('button', { name: 'Expandir todo', exact: true }).click()
  await page
    .getByRole('button', { name: /, 0 entrenos$/ })
    .first()
    .click()
  await expect(
    page.getByText('No hay entreno para este día.', { exact: true }).first()
  ).toBeVisible()
  await page.getByRole('button', { name: '+ Agregar entreno', exact: true }).first().click()
  await expect(page.getByRole('textbox', { name: 'Título del entreno', exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Agregar serie', exact: true }).first()
  ).toBeVisible()
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar', exact: true }).first()).toBeVisible()
  const saved = await (
    await fetch(`http://127.0.0.1:8080/v1/${stored.name}`, {
      headers: { authorization: 'Bearer owner' },
    })
  ).json()
  // create path writes visibility + summary; the workout save above went through update()
  expect(saved.fields.visibility.stringValue).toBe('private')
  expect(saved.fields.summary.mapValue.fields.title.stringValue).toBeTruthy()
  expect(saved.fields.summary.mapValue.fields.authorRole.stringValue).toBe('coach')
  expect(saved.fields.updatedAt).toBeTruthy()
  let blocks = 0
  for (const cycle of saved.fields.cycles.arrayValue.values) {
    for (const session of Object.values(
      cycle.mapValue.fields.objectiveWorkouts?.mapValue.fields || {}
    )) {
      const value = session as {
        arrayValue: {
          values?: Array<{
            mapValue: { fields: { blocks: { arrayValue: { values?: unknown[] } } } }
          }>
        }
      }
      for (const workout of value.arrayValue.values || [])
        blocks += workout.mapValue.fields.blocks.arrayValue.values?.length || 0
    }
  }
  expect(blocks).toBe(1)
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click()
  await page.getByRole('button', { name: 'Agregar serie', exact: true }).first().click()
  const series = page.getByRole('dialog', { name: 'Agregar serie', exact: true })
  const repetitions = series.getByRole('spinbutton', {
    name: '¿Cuántas repeticiones?',
    exact: true,
  })
  await expect(repetitions).toBeFocused()
  const plus = series.getByRole('button', { name: 'Aumentar ¿cuántas repeticiones?' })
  const bounds = await plus.boundingBox()
  if (!bounds) throw new Error('STEPPER_BUTTON_NOT_VISIBLE')
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await expect.poll(async () => Number(await repetitions.inputValue())).toBeGreaterThanOrEqual(4)
  await page.mouse.up()
  const stopped = await repetitions.inputValue()
  await page.waitForTimeout(250)
  await expect(repetitions).toHaveValue(stopped)
})
