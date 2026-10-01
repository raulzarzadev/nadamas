import { expect, test } from '@playwright/test'
import { destinationForRole } from '../lib/role-destination'

test('el modo escuela abre Horarios por defecto', () => {
  expect(destinationForRole('school')).toBe('/school/classes')
})

test('la ruta anterior al panel de escuela abre Horarios', async ({ page }) => {
  await page.goto('/school')
  await expect(page).toHaveURL(/\/school\/classes|\/login/)
})

test('legacy /dashboard redirects to /athlete/home', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/athlete\/home|\/login/)
})

test('legacy /dashboard/profile redirects to /profile', async ({ page }) => {
  await page.goto('/dashboard/profile')
  await expect(page).toHaveURL(/\/profile|\/login/)
})

test('legacy /dashboard/events redirects to /athlete/progress', async ({ page }) => {
  await page.goto('/dashboard/events')
  await expect(page).toHaveURL(/\/athlete\/progress|\/login/)
})
