interface SendEmailInput {
  to: Array<{ email: string; name?: string }>
  subject: string
  htmlContent: string
  textContent: string
}

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'Nadamas'

  if (!apiKey || !senderEmail) {
    console.warn('Brevo email skipped: missing BREVO_API_KEY or BREVO_SENDER_EMAIL')
    return { skipped: true }
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      ...input,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Brevo request failed: ${response.status} ${detail}`)
  }

  return response.json()
}
