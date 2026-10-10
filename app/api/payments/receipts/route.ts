import { randomUUID } from 'node:crypto'
import { getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { NextResponse } from 'next/server'
import type { PaymentOrder } from '@/lib/payments/model'
import { paymentAccess } from '@/lib/server/payments/access'
import { orderRef } from '@/lib/server/payments/store'
import { runPaymentTransaction } from '@/lib/server/payments/transaction'

export const runtime = 'nodejs'
async function authorize(request: Request) {
  const access = await paymentAccess(request)
  if (access.response) return access
  const id = new URL(request.url).searchParams.get('orderId') || ''
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id))
    return { response: NextResponse.json({ error: 'Comprobante no disponible.' }, { status: 404 }) }
  const snapshot = await orderRef(id).get()
  const order = snapshot.data() as PaymentOrder | undefined
  if (
    !order ||
    order.scope !== access.key ||
    (!access.manager &&
      order.ownerId !== access.caller.uid &&
      !access.students.some(
        (student) => student.id === order.studentId && student.ownerId === access.caller.uid
      ))
  )
    return { response: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
  return { access, order, response: undefined }
}
function bucket() {
  const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '{}')
  return getStorage(getApps()[0]).bucket(
    process.env.FIREBASE_STORAGE_BUCKET || config.storageBucket
  )
}
export async function POST(request: Request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response
    const { order, access } = context
    if (order.status !== 'pending' || order.method !== 'transfer')
      return NextResponse.json({ error: 'Este pago ya no admite comprobantes.' }, { status: 409 })
    const body = (await request.json()) as { data?: string }
    if (typeof body.data !== 'string' || body.data.length > 2_900_000)
      return NextResponse.json({ error: 'Sube una imagen o PDF de hasta 2 MB.' }, { status: 400 })
    const match = body.data.match(
      /^data:(image\/(?:png|jpeg)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/
    )
    if (!match)
      return NextResponse.json({ error: 'Sube una imagen PNG, JPG o un PDF.' }, { status: 400 })
    const buffer = Buffer.from(match[2], 'base64')
    const magic =
      match[1] === 'application/pdf'
        ? buffer.subarray(0, 5).toString() === '%PDF-'
        : match[1] === 'image/png'
          ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
    if (!magic || buffer.length > 2 * 1024 * 1024)
      return NextResponse.json(
        { error: 'El comprobante no es válido. Usa PNG, JPG o PDF de hasta 2 MB.' },
        { status: 400 }
      )
    const receiptPath = `paymentReceipts/${order.id}/${randomUUID()}`
    const file = bucket().file(receiptPath)
    await file.save(buffer, {
      resumable: false,
      metadata: { contentType: match[1], cacheControl: 'private, no-store' },
    })
    try {
      const previousPath = await runPaymentTransaction(async (tx) => {
        const latest = await tx.get(orderRef(order.id))
        if (latest.data()?.status !== 'pending') throw new Error('PAYMENT_ALREADY_REVIEWED')
        tx.update(orderRef(order.id), {
          receiptPath,
          receiptType: match[1],
          receiptUploadedBy: access.caller.uid,
        })
        return latest.data()?.receiptPath as string | undefined
      })
      if (previousPath && previousPath !== receiptPath)
        await bucket()
          .file(previousPath)
          .delete()
          .catch(() => {})
    } catch (error) {
      await file.delete().catch(() => {})
      throw error
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PAYMENT_RECEIPT_WRITE]', error)
    return NextResponse.json(
      { error: 'No pudimos guardar el comprobante. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
export async function GET(request: Request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response
    if (!context.order.receiptPath)
      return NextResponse.json({ error: 'Todavía no hay comprobante.' }, { status: 404 })
    const [buffer] = await bucket().file(context.order.receiptPath).download()
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': context.order.receiptType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="comprobante.${context.order.receiptType === 'application/pdf' ? 'pdf' : context.order.receiptType === 'image/png' ? 'png' : 'jpg'}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[PAYMENT_RECEIPT_READ]', error)
    return NextResponse.json(
      { error: 'No pudimos abrir el comprobante. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
