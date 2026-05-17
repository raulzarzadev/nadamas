import { sendEmail } from './brevo'

export function sendOtpEmail(email: string, code: string) {
  return sendEmail({
    to: [{ email }],
    subject: 'Tu código para entrar a Nadamas',
    textContent: `Tu código para entrar a Nadamas es ${code}. Expira en 10 minutos.`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;color:#102a43">
        <h1 style="margin-bottom:8px">Tu código de acceso</h1>
        <p>Usa este código para entrar a Nadamas:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p>
        <p>Expira en 10 minutos.</p>
      </div>
    `,
  })
}

export function sendVerificationRequestedEmails({
  adminEmails,
  coachEmail,
}: {
  adminEmails: string[]
  coachEmail?: string
}) {
  const tasks: Promise<unknown>[] = []

  if (adminEmails.length) {
    tasks.push(
      sendEmail({
        to: adminEmails.map((email) => ({ email })),
        subject: 'Nueva solicitud de verificación',
        textContent:
          'Un coach solicitó verificación de identidad. Entra al panel de administración para revisarla.',
        htmlContent:
          '<p>Un coach solicitó verificación de identidad.</p><p>Entra al panel de administración para revisarla.</p>',
      })
    )
  }

  if (coachEmail) {
    tasks.push(
      sendEmail({
        to: [{ email: coachEmail }],
        subject: 'Recibimos tu solicitud de verificación',
        textContent:
          'Recibimos tu solicitud de verificación. El equipo de Nadamas revisará tu documento.',
        htmlContent:
          '<p>Recibimos tu solicitud de verificación.</p><p>El equipo de Nadamas revisará tu documento.</p>',
      })
    )
  }

  return Promise.all(tasks)
}

export function sendVerificationReviewedEmail({
  email,
  status,
}: {
  email: string
  status: 'verified' | 'rejected'
}) {
  const verified = status === 'verified'
  return sendEmail({
    to: [{ email }],
    subject: verified
      ? 'Tu perfil fue verificado'
      : 'Tu solicitud de verificación necesita cambios',
    textContent: verified
      ? 'Tu identidad fue verificada por el equipo de Nadamas.'
      : 'Tu solicitud fue rechazada. Sube una imagen más clara de tu INE para intentarlo de nuevo.',
    htmlContent: verified
      ? '<p>Tu identidad fue verificada por el equipo de Nadamas.</p>'
      : '<p>Tu solicitud fue rechazada.</p><p>Sube una imagen más clara de tu INE para intentarlo de nuevo.</p>',
  })
}
