import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { escapeMarketingHtml } from '@/lib/marketing'
import { adminDb } from '@/lib/server/firebase-admin'
import {
  listRecipients,
  marketingCaller,
  marketingConfig,
  recipient,
  unsubscribeToken,
} from '@/lib/server/marketing/store'
export const runtime = 'nodejs'
export const maxDuration = 300
export async function GET(request: Request) {
  if (!(await marketingCaller(request, true)))
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  try {
    const [users, history] = await Promise.all([
      listRecipients(),
      adminDb.collection('marketingCampaigns').orderBy('createdAt', 'desc').limit(20).get(),
    ])
    const config = marketingConfig()
    return NextResponse.json(
      {
        users,
        ready: config.ready,
        sender: config.email || 'novedades@marketing.nadamas.app',
        campaigns: history.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    reportServerError('MARKETING_READ', error, request)
    return NextResponse.json({ error: 'No pudimos cargar email marketing.' }, { status: 500 })
  }
}
export async function POST(request: Request) {
  const caller = await marketingCaller(request, true)
  if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body.subject !== 'string' ||
    !body.subject.trim() ||
    body.subject.length > 150 ||
    /[\r\n]/.test(body.subject) ||
    typeof body.content !== 'string' ||
    !body.content.trim() ||
    body.content.length > 20000 ||
    !Array.isArray(body.userIds) ||
    body.userIds.length < 1 ||
    body.userIds.length > 50 ||
    body.userIds.some(
      (id: unknown) => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)
    ) ||
    typeof body.id !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(body.id)
  )
    return NextResponse.json(
      { error: 'Revisa asunto, mensaje y destinatarios (máximo 50).' },
      { status: 400 }
    )
  const config = marketingConfig()
  if (!config.ready)
    return NextResponse.json(
      { error: 'Configura y verifica el remitente de marketing antes de enviar.' },
      { status: 409 }
    )
  const campaign = adminDb.collection('marketingCampaigns').doc(body.id)
  try {
    // Atomic create makes duplicate submissions safe, including requests whose response was lost.
    await campaign.create({
      subject: body.subject.trim(),
      content: body.content.trim(),
      createdAt: Date.now(),
      createdBy: caller.uid,
      status: 'sending',
      total: new Set(body.userIds).size,
      sent: 0,
      skipped: 0,
      failed: 0,
      uncertain: 0,
    })
  } catch (error) {
    if ((error as { code?: number }).code === 6)
      return NextResponse.json(
        { error: 'Esta campaña ya fue procesada. Revisa el historial antes de crear otro envío.' },
        { status: 409 }
      )
    reportServerError('MARKETING_CREATE', error, request)
    return NextResponse.json({ error: 'No pudimos crear la campaña.' }, { status: 500 })
  }
  const counts = { sent: 0, skipped: 0, failed: 0, uncertain: 0 }
  const seen = new Set<string>()
  try {
    for (const id of new Set<string>(body.userIds)) {
      const delivery = campaign.collection('deliveries').doc(id)
      const user = await recipient(id)
      if (!user.eligible || seen.has(user.email)) {
        counts.skipped++
        await delivery.set({ status: 'skipped', updatedAt: Date.now() })
        continue
      }
      seen.add(user.email)
      const url = `https://nadamas.app/api/marketing/unsubscribe?token=${encodeURIComponent(unsubscribeToken(user.email))}`
      await delivery.set({ status: 'sending', updatedAt: Date.now() })
      let status: 'sent' | 'failed' | 'uncertain' = 'uncertain'
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          signal: AbortSignal.timeout(4000),
          headers: {
            'api-key': config.key || '',
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { email: config.email, name: 'Nadamas' },
            to: [{ email: user.email }],
            subject: body.subject.trim(),
            textContent: `${body.content.trim()}\n\nDejar de recibir correos: ${url}`,
            htmlContent: `<div style="font-family:Arial;max-width:600px;margin:auto"><p><strong>Nadamas</strong></p><div style="white-space:pre-wrap">${escapeMarketingHtml(body.content.trim())}</div><hr><p><a href="${escapeMarketingHtml(url)}">Dejar de recibir correos</a></p></div>`,
            headers: {
              'List-Unsubscribe': `<${url}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
            tags: ['nadamas-marketing'],
          }),
        })
        status = response.ok ? 'sent' : response.status >= 500 ? 'uncertain' : 'failed'
        if (!response.ok)
          reportServerError(
            'MARKETING_PROVIDER',
            new Error(`brevo_status_${response.status}`),
            request
          )
      } catch (error) {
        reportServerError('MARKETING_DELIVERY', error, request)
      }
      counts[status]++
      await delivery.set({ status, updatedAt: Date.now() })
      await campaign.update(counts)
    }
    await campaign.update({
      ...counts,
      status: counts.failed || counts.uncertain ? 'partial' : 'completed',
      finishedAt: Date.now(),
    })
    return NextResponse.json({ ok: true, ...counts })
  } catch (error) {
    reportServerError('MARKETING_SEND', error, request)
    await campaign.update({ ...counts, status: 'interrupted' }).catch(() => {})
    return NextResponse.json(
      { error: 'El envío se interrumpió. Revisa el historial antes de enviar otra campaña.' },
      { status: 500 }
    )
  }
}
