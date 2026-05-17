import { sendEmail } from './brevo'

export function sendOtpEmail(email: string, code: string) {
  return sendEmail({
    to: [{ email }],
    subject: 'Tu código para entrar a Nadamas',
    textContent: `Tu código para entrar a Nadamas es ${code}. Expira en 10 minutos.`,
    htmlContent: `
      <div style="margin:0;background:#f5fbfd;padding:28px 12px;font-family:Arial,sans-serif;color:#102a43">
        <div style="margin:0 auto;max-width:520px;overflow:hidden;border:1px solid #d8edf4;border-radius:28px;background:#ffffff">
          <div style="padding:24px 28px;background:#eef9fc">
            <p style="margin:0;color:#0877ad;font-size:14px;font-weight:700">nadamas.app</p>
            <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15">Tu código de acceso</h1>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 18px;color:#52606d;font-size:16px;line-height:1.5">
              Usa este código para entrar a Nadamas:
            </p>
            <div style="margin:0 0 20px;border-radius:20px;background:#102a43;color:#ffffff;padding:18px 20px;text-align:center;font-size:34px;font-weight:700;letter-spacing:10px">
              ${code}
            </div>
            <p style="margin:0;color:#52606d;font-size:14px;line-height:1.5">
              Expira en 10 minutos. Si tú no pediste este acceso, puedes ignorar este correo.
            </p>
          </div>
        </div>
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
