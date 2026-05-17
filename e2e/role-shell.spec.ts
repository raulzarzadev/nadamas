import { test, expect } from '@playwright/test'

test('legacy /dashboard redirects to /athlete/home', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/athlete\/home|\/login/)
})

test('legacy /dashboard/profile redirects to /profile', async ({ page }) => {
  await page.goto('/dashboard/profile')
  await expect(page).toHaveURL(/\/profile|\/login/)
})

test('legacy /dashboard/events redirects to /athlete/progress', async ({
  page,
}) => {
  await page.goto('/dashboard/events')
  await expect(page).toHaveURL(/\/athlete\/progress|\/login/)
})
