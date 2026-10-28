# Operación de suscripciones por escuela

Implementación aislada en `feat/subscriptions-flow`. No se ha desplegado ni migrado producción.

## Datos y permisos

`schoolSubscriptions` conserva prueba, periodo y acceso provisional; `subscriptionTrialOwners` impide repetir pruebas por propietario. `subscriptionOrders` registra transferencias y fechas de ingreso/revisión; `subscriptionCodes` guarda códigos ligados a una escuela; `subscriptionSettings/bank` guarda los datos de transferencia; `subscriptionAudit` conserva cambios administrativos. `subscriptionStripeEvents` deduplica entregas del proveedor.

Solo el propietario de la escuela o admin administra su suscripción. Profesores activos consultan el estado operativo. Las colecciones se gestionan por API autenticada; no permitir escrituras desde SDK cliente. Confirmar o invalidar transferencias es exclusivo de admin.

## Transferencias

Configurar banco, beneficiario y cuenta/CLABE desde la sección Suscripción de Nadamas del panel admin. Cada solicitud conserva su importe y referencia `ND…`; copiar esa referencia al concepto. “Ya transferí” concede acceso completo provisional hasta revisión, incluso en primera contratación o reactivación y aunque termine la gracia.

Admin confirma con fecha real del ingreso o invalida. Confirmar dos veces no duplica periodos. Invalidar retira la continuidad provisional respetando otro acceso vigente. El mismo pedido invalidado no puede reportarse otra vez. Antes de reportarla, la escuela puede cancelar una solicitud pendiente para cambiar de medio de pago; no se permite cancelar por cuenta propia un pago ya reportado. Admin puede liberar expresamente el bloqueo para que la escuela genere otra solicitud legítima, con referencia nueva.

El precio especial se conserva si el dinero entró dentro del periodo o gracia aunque se revise después. Un ingreso tardío con importe promocional exige resolver la diferencia; no cambiar silenciosamente el importe recibido.

## Stripe

Variables privadas del servidor:

- `STRIPE_SECRET_KEY`: clave secreta de Stripe; comenzar con modo de pruebas.
- `STRIPE_WEBHOOK_SECRET`: secreto del endpoint de webhook.
- `SUBSCRIPTION_APP_URL`: origen HTTPS canónico de la aplicación para retorno del checkout; en desarrollo admite `http://localhost:3002`.
- `CRON_SECRET`: autenticación de los avisos programados.

Crear endpoint `POST /api/subscriptions/webhook` con versión `2025-03-31.basil` y eventos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Las solicitudes salientes fijan esa versión. Se comprueba firma sobre el cuerpo original, tolerancia temporal de cinco minutos y deduplicación. No se activa acceso por regresar a la URL de éxito.

El checkout genera un precio mensual MXN desde el importe validado en servidor, sin necesidad de crear Price IDs manuales. No se usan los códigos promocionales nativos de Stripe: los códigos de Nadamas están ligados a escuela.

Habilitar Customer Portal para actualizar métodos de pago y cancelar al final del periodo. Deshabilitar cambios de plan/precio desde el portal. Configurar recuperación de pagos de Stripe para cancelar suscripciones no recuperadas al terminar los 3 días de gracia y evitar continuar cobrando un precio promocional perdido. Probar esta configuración con reloj de pruebas antes de activar cobros reales.

No se permite contratar tarjeta si hay una transferencia pendiente o un periodo por transferencia vigente, ni crear transferencia mientras exista suscripción con tarjeta o checkout abierto. Es una protección contra doble cobro. Los códigos se aplican antes de contratar con tarjeta; cambiar el precio de una suscripción de Stripe ya existente queda bloqueado explícitamente hasta implementar cambio de tarifa en el proveedor.

Un pago promocional con tarjeta recibido después de perder el beneficio no activa acceso automáticamente: genera la excepción privada `STRIPE_PROMO_LAPSED`, que requiere conciliación, devolución o ajuste por soporte antes del lanzamiento real.

Probar en sandbox: compra de $299, compra de $49 con código, cancelación/reanudación, firma incorrecta, entrega duplicada/desordenada, fallo de renovación y fin de gracia. Sin claves y webhook configurados, la interfaz informa que tarjeta no está disponible; no simula pagos.

Referencias: [Checkout](https://docs.stripe.com/api/checkout/sessions/create), [objeto de suscripción y periodos por item](https://docs.stripe.com/api/subscriptions/object), [firmas y entregas de eventos](https://docs.stripe.com/events/manage-webhook-endpoints).

## Escuelas existentes

Los registros antiguos sin suscripción conservan acceso hasta la migración explícita; no vencerlos usando su fecha histórica de creación. Anunciar la fecha de inicio y ejecutar primero el dry-run:

```sh
node scripts/migrate-subscriptions.mjs --starts-at=2026-11-01T00:00:00Z
```

La fecha anterior es un ejemplo, no una fecha de lanzamiento aprobada. Revisar resultados y propietarios antes de aplicar. En emuladores usar `FIRESTORE_EMULATOR_HOST` y agregar `--apply`. Producción requiere credenciales privadas y los argumentos explícitos `--production --apply`. El script es idempotente y concede una prueba al propietario en su escuela más antigua; las adicionales no reciben prueba. No se ejecutó en producción.

Publicar las reglas Firestore y el índice de `subscriptionOrders` (`schoolId`, `createdAt` descendente) antes de activar las nuevas pantallas. La ruta de migración de escuelas antiguas debe completarse al lanzar el sistema; de otro modo siguen sin restricciones. No desplegar solo partes del sistema.

## Avisos

`GET /api/subscriptions/reminders`, autenticado con `CRON_SECRET`, crea avisos internos deduplicados para el propietario a 7, 3 y 1 días, y al vencer. Se configura ejecución diaria en `vercel.json`. Las restricciones no dependen del cron: consultan el tiempo de servidor en cada operación. Los avisos por correo no están habilitados en esta entrega.

## Validación local

Usar emuladores Firebase Auth/Firestore/Storage; nunca fixtures contra producción. Instalar dependencias en el worktree (Turbopack no acepta un node_modules enlazado fuera de su raíz). Arrancar con `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1`, configuración Firebase local y `OTP_SECRET` local para pruebas de interfaz.

```sh
pnpm typecheck
node --test scripts/tests/subscriptions.test.mjs scripts/tests/subscription-gates.test.mjs scripts/tests/subscription-stripe.test.mjs scripts/tests/subscription-card.test.mjs scripts/tests/subscription-reminders.test.mjs scripts/tests/request-performance.test.mjs scripts/tests/payments.test.mjs
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 pnpm exec playwright test e2e/subscriptions.spec.ts e2e/admin-overview.spec.ts --workers=1
```
