/** Safe, fixed UI copy: never display provider diagnostics or arbitrary Error.message. */
export function paymentMessage(
  error: unknown,
  fallback = 'No pudimos completar la acción. Revisa los datos e inténtalo de nuevo.'
) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  switch (code) {
    case 'receipt_pdf_too_large':
      return 'El PDF supera los 2 MB. Exporta una versión más pequeña o adjunta una imagen; la optimizamos automáticamente.'
    case 'receipt_too_large':
      return 'No pudimos reducir la imagen a 2 MB. Elige otra imagen del comprobante.'
    case 'receipt_invalid_type':
      return 'Elige un comprobante en formato PNG, JPG o PDF.'
    case 'receipt_read_failed':
      return 'No pudimos leer el archivo. Selecciónalo de nuevo.'
    case 'receipt_required':
      return 'Adjunta el comprobante de transferencia para enviar el pago.'
    case 'receipt_upload_failed':
      return 'El pago quedó pendiente, pero no pudimos subir el comprobante. Inténtalo de nuevo; no se creará otro pago.'
    case 'payment_required':
      return 'No hay saldo o vigencia disponible para este horario. Consulta Pagos para adquirir clases.'
    case 'package_confirmation_required':
      return 'Confirma que deseas usar una clase de tu paquete para este horario.'
    case 'payment_invalid':
      return 'Revisa los datos de pago e inténtalo de nuevo.'
    case 'payment_limit':
      return 'Contacta al responsable para revisar tu cuenta.'
    default:
      return fallback
  }
}
