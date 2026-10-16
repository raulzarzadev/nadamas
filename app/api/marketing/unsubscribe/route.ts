import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { escapeMarketingHtml } from '@/lib/marketing'
import { readUnsubscribeToken, suppressEmail } from '@/lib/server/marketing/store'
export const runtime = 'nodejs'
function page(content: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="es"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preferencias de correo · Nadamas</title><body style="font-family:Arial;max-width:480px;margin:80px auto;padding:24px"><h1>Correos de Nadamas</h1>${content}</body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
      },
    }
  )
}
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!readUnsubscribeToken(token)) return page('<p>Este enlace no es válido.</p>', 400)
  return page(
    `<p>Dejarás de recibir novedades y promociones. Los correos de acceso y reservas seguirán llegando.</p><form method="post"><input type="hidden" name="token" value="${escapeMarketingHtml(token)}"><button type="submit">Dejar de recibir correos</button></form>`
  )
}
export async function POST(request: Request) {
  const url = new URL(request.url)
  const form = await request.formData().catch(() => null)
  const token = url.searchParams.get('token') || String(form?.get('token') || '')
  const email = readUnsubscribeToken(token)
  if (!email) return page('<p>Este enlace no es válido.</p>', 400)
  try {
    await suppressEmail(email, 'email_link')
    return page('<p>Listo. Ya no recibirás novedades ni promociones de Nadamas.</p>')
  } catch (error) {
    reportServerError('MARKETING_UNSUBSCRIBE', error, request)
    return NextResponse.json(
      { error: 'No pudimos guardar tu baja. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
