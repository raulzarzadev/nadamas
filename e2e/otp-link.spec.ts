import { expect, test } from '@playwright/test'

const FIRESTORE_EMULATOR = 'http://127.0.0.1:8080'
const PROJECT_ID = 'nadamas-b1ecf'

async function emulatorAvailable() {
  try {
    const response = await fetch(FIRESTORE_EMULATOR)
    return response.ok
  } catch {
    return false
  }
}

async function readOtpDoc(email: string) {
  const response = await fetch(
    `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/otpLoginCodes/${encodeURIComponent(email)}`,
    { headers: { authorization: 'Bearer owner' } }
  )
  if (!response.ok) return null
  const doc = (await response.json()) as {
    fields?: Record<string, { stringValue?: string }>
  }
  return doc.fields || null
}

test('magic link signs in and completes the pending booking', async ({ page, baseURL }) => {
  test.skip(!(await emulatorAvailable()), 'requires the Firestore emulator')

  const email = `otp-link-${Date.now()}@test.com`
  const requestResponse = await fetch(`${baseURL}/api/auth/otp/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      pendingBooking: {
        athleteName: 'E2E Link',
        selections: [
          {
            coachId: 'coach-raul',
            offeringId: 'off-e2e',
            scheduleId: 'sch-e2e',
            date: '2030-01-15',
            locationName: 'Alberca E2E',
            days: ['mon'],
            startTime: '10:00',
            endTime: '11:00',
            priceCents: 40000,
          },
        ],
      },
    }),
  })
  expect(requestResponse.ok).toBe(true)

  const otpDoc = await readOtpDoc(email)
  const linkToken = otpDoc?.devLinkToken?.stringValue
  expect(linkToken).toBeTruthy()

  await page.goto(`/auth/link?email=${encodeURIComponent(email)}&token=${linkToken}`)
  await expect(page.getByRole('heading', { name: 'Confirma tu acceso' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar' }).click()

  await page.waitForURL('**/athlete/bookings')

  // Single use: the OTP doc must be gone after a successful confirmation.
  expect(await readOtpDoc(email)).toBeNull()
})

test('a used link shows the error state with manual code fallback', async ({ page }) => {
  test.skip(!(await emulatorAvailable()), 'requires the Firestore emulator')

  await page.goto('/auth/link?email=nobody%40test.com&token=deadbeef')
  await page.getByRole('button', { name: 'Confirmar' }).click()

  await expect(page.getByRole('heading', { name: 'Este enlace ya no es válido' })).toBeVisible()
  await expect(page.getByLabel('Código')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pedir un código nuevo' })).toBeVisible()
})
