import { test, expect } from '@playwright/test'

test('landing page has nadamas in the title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/nadamas/i)
})
