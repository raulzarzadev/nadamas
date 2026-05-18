import { expect, test } from '@playwright/test'

test('marketplace preview renders after offerings refactor', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))

  await page.goto('/#coaches')
  await expect(page.getByRole('heading', { name: /Encuentra un coach/i })).toBeVisible()
  await expect(
    page.locator('text=/Cargando coaches|coach|Aún no encontramos/i').first()
  ).toBeVisible()
  expect(errors.join('\n')).not.toMatch(/coach-offerings|coach-booking|resolveOfferings/)
})
