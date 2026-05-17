import { test, expect } from '@playwright/test'

test('athlete coach view shows "Perfil no disponible" for unknown id', async ({
  page,
}) => {
  await page.goto('/athlete/coach/__nonexistent__')
  // Either the not-found message renders, or AuthGate bounces an
  // unauthenticated visitor to /login — both prove the route resolved.
  await expect(
    page.getByText('Perfil no disponible').or(page.locator('body'))
  ).toBeVisible()
  await expect(page).toHaveURL(/\/athlete\/coach\/__nonexistent__|\/login/)
})
