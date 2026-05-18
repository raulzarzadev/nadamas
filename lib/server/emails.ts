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

export function sendBookingCancelledEmail({
  email,
  coachName,
  athleteName,
  locationName,
  slotLabel,
}: {
  email: string
  coachName?: string
  athleteName: string
  locationName: string
  slotLabel: string
}) {
  const greeting = coachName ? `Hola ${coachName},` : 'Hola,'
  return sendEmail({
    to: [{ email }],
    subject: 'Una reserva fue cancelada',
    textContent: `${athleteName} canceló su clase en ${locationName} (${slotLabel}).`,
    htmlContent: `
      <div style="margin:0;background:#f5fbfd;padding:28px 12px;font-family:Arial,sans-serif;color:#102a43">
        <div style="margin:0 auto;max-width:520px;overflow:hidden;border:1px solid #d8edf4;border-radius:28px;background:#ffffff">
          <div style="padding:24px 28px;background:#eef9fc">
            <p style="margin:0;color:#0877ad;font-size:14px;font-weight:700">nadamas.app</p>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2">Reserva cancelada</h1>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 14px;color:#52606d;font-size:16px;line-height:1.5">${greeting}</p>
            <p style="margin:0 0 14px;color:#52606d;font-size:16px;line-height:1.5">
              <strong>${athleteName}</strong> canceló su clase contigo.
            </p>
            <div style="margin:0 0 8px;border-radius:16px;background:#f5fbfd;padding:16px 18px">
              <p style="margin:0 0 6px;color:#102a43;font-size:15px"><strong>Lugar:</strong> ${locationName}</p>
              <p style="margin:0;color:#102a43;font-size:15px"><strong>Horario:</strong> ${slotLabel}</p>
            </div>
          </div>
        </div>
      </div>
    `,
  })
}

export function sendBookingConfirmedEmail({
  email,
  coachName,
  athleteName,
  athletePhone,
  bookings,
}: {
  email: string
  coachName?: string
  athleteName: string
  athletePhone?: string
  bookings: Array<{
    locationName: string
    date: string
    startTime: string
    priceCents: number | null
  }>
}) {
  const greeting = coachName ? `Hola ${coachName},` : 'Hola,'
  const rows = bookings
    .map(
      (booking) =>
        `<li style="margin:0 0 8px"><strong>${booking.date}</strong> · ${booking.startTime} · ${booking.locationName}${booking.priceCents !== null ? ` · $${(booking.priceCents / 100).toFixed(2)}` : ''}</li>`
    )
    .join('')
  const textRows = bookings
    .map(
      (booking) =>
        `- ${booking.date} · ${booking.startTime} · ${booking.locationName}${booking.priceCents !== null ? ` · $${(booking.priceCents / 100).toFixed(2)}` : ''}`
    )
    .join('\n')
  return sendEmail({
    to: [{ email }],
    subject: bookings.length === 1 ? 'Nueva clase agendada' : 'Nuevas clases agendadas',
    textContent: `${athleteName} agendó ${bookings.length === 1 ? 'una clase' : `${bookings.length} clases`} contigo.\n${textRows}`,
    htmlContent: `
      <div style="margin:0;background:#f5fbfd;padding:28px 12px;font-family:Arial,sans-serif;color:#102a43">
        <div style="margin:0 auto;max-width:520px;overflow:hidden;border:1px solid #d8edf4;border-radius:28px;background:#ffffff">
          <div style="padding:24px 28px;background:#eef9fc">
            <p style="margin:0;color:#0877ad;font-size:14px;font-weight:700">nadamas.app</p>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2">Nueva reserva</h1>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 14px;color:#52606d;font-size:16px;line-height:1.5">${greeting}</p>
            <p style="margin:0 0 14px;color:#52606d;font-size:16px;line-height:1.5">
              <strong>${athleteName}</strong> agendó ${bookings.length === 1 ? 'una clase' : `${bookings.length} clases`} contigo.
            </p>
            ${athletePhone ? `<p style="margin:0 0 14px;color:#52606d;font-size:15px"><strong>Teléfono:</strong> ${athletePhone}</p>` : ''}
            <ul style="margin:0;padding:16px 18px 16px 34px;border-radius:16px;background:#f5fbfd">${rows}</ul>
          </div>
        </div>
      </div>
    `,
  })
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
