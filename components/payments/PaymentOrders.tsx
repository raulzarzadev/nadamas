'use client'
import { FiDownload, FiUpload } from 'react-icons/fi'
import type { PaymentOrder } from '@/lib/payments/model'
import { money } from './PaymentProductForm'

const MAX_RECEIPT_BYTES = 2 * 1024 * 1024
const preparedReceipts = new WeakMap<File, Promise<string>>()
async function prepareReceipt(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type))
    throw { code: 'receipt_invalid_type' }
  let receipt: Blob = file
  if (file.size > MAX_RECEIPT_BYTES) {
    if (file.type === 'application/pdf') throw { code: 'receipt_pdf_too_large' }
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(file)
    } catch {
      throw { code: 'receipt_read_failed' }
    }
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) throw { code: 'receipt_read_failed' }
      let scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
      let optimized: Blob | null = null
      // Prefer full resolution and high quality; only shrink further if needed.
      for (let attempt = 0; attempt < 8; attempt++) {
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        const quality = attempt === 0 ? 0.9 : attempt === 1 ? 0.82 : 0.75
        optimized = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', quality)
        )
        if (optimized && optimized.size <= MAX_RECEIPT_BYTES) break
        if (attempt >= 1) scale *= 0.8
      }
      if (!optimized || optimized.size > MAX_RECEIPT_BYTES) throw { code: 'receipt_too_large' }
      receipt = optimized
      canvas.width = 0
      canvas.height = 0
    } finally {
      bitmap.close()
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject({ code: 'receipt_read_failed' })
    reader.readAsDataURL(receipt)
  })
}
export function receiptData(file: File): Promise<string> {
  const cached = preparedReceipts.get(file)
  if (cached) return cached
  const result = prepareReceipt(file).catch((error) => {
    preparedReceipts.delete(file)
    throw error
  })
  preparedReceipts.set(file, result)
  return result
}
export default function PaymentOrders({
  orders,
  manager,
  busy,
  canAccess,
  onReview,
  onUpload,
  onDownload,
}: {
  orders: PaymentOrder[]
  canAccess: (order: PaymentOrder) => boolean
  manager: boolean
  busy: boolean
  onReview: (order: PaymentOrder, status: 'approved' | 'rejected') => void
  onUpload: (order: PaymentOrder, file: File) => void
  onDownload: (order: PaymentOrder) => void
}) {
  if (!orders.length)
    return <p className="py-4 text-sm text-(--c-text-2)">Todavía no hay pagos registrados.</p>
  return (
    <ul className="grid gap-2">
      {orders.map((order) => (
        <li key={order.id} className="grid gap-2 rounded-xl border border-(--c-border) p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <strong className="text-sm">
                {order.studentName} · {order.product.name}
              </strong>
              <p className="text-xs text-(--c-text-2)">
                {money(order.product.priceCents)} ·{' '}
                {order.method === 'cash' ? 'Efectivo' : 'Transferencia'} ·{' '}
                {new Date(order.createdAt).toLocaleDateString('es-MX')}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs ${order.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : order.status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'}`}
            >
              {order.status === 'pending'
                ? 'Pendiente de confirmación'
                : order.status === 'approved'
                  ? 'Confirmado'
                  : 'Rechazado'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {order.receiptPath && canAccess(order) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onDownload(order)}
                className="btn btn-ghost min-h-11 gap-1 text-xs"
              >
                <FiDownload aria-hidden="true" /> Comprobante
              </button>
            )}
            {order.status === 'pending' && order.method === 'transfer' && canAccess(order) && (
              <label
                className={`btn btn-ghost relative min-h-11 gap-1 text-xs ${busy ? 'pointer-events-none opacity-50' : ''}`}
              >
                <FiUpload aria-hidden="true" />
                {order.receiptPath ? 'Cambiar comprobante' : 'Subir comprobante'}
                <input
                  disabled={busy}
                  aria-label={`Subir comprobante de ${order.product.name}`}
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onUpload(order, file)
                    event.target.value = ''
                  }}
                />
              </label>
            )}
            {manager && order.status === 'pending' && (
              <>
                <button
                  type="button"
                  disabled={busy || (order.method === 'transfer' && !order.receiptPath)}
                  className="btn btn-primary min-h-11 text-xs"
                  onClick={() => onReview(order, 'approved')}
                >
                  Confirmar pago
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="btn btn-ghost min-h-11 text-xs"
                  onClick={() => onReview(order, 'rejected')}
                >
                  Rechazar
                </button>
              </>
            )}
          </div>
          {order.status === 'pending' && order.method === 'transfer' && !order.receiptPath && (
            <p className="text-xs text-(--c-text-2)">
              Falta subir el comprobante (PNG, JPG o PDF, máximo 2 MB).
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
