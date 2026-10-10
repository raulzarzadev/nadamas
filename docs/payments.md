# Pagos

## Uso

`/school/payments`, `/coach/payments` y `/athlete/payments` comparten `PaymentsWorkspace` y `PaymentsPanel`. El alumno dispone también del acceso `$ · N clases` en la cabecera de su escuela y de un enlace en el perfil público del entrenador para adquirir clases antes de su primera reserva.

Cada escuela y cada entrenador independiente tienen un espacio separado (`school:<id>` / `coach:<uid>`). Los pagos se habilitan explícitamente desde Configuración: por clase, por periodos, o ambos. Están deshabilitados inicialmente; habilitarlos no cobra retroactivamente las reservas existentes.

- Coordinación administra los pagos de su escuela. Un entrenador independiente administra los de su espacio personal. Los entrenadores de escuela no ven ni administran Pagos: el acceso se oculta en su navegación y la API rechaza su acceso. Los pagos personales solo se administran fuera del espacio de una escuela.
- La vista de alumno (`view=student`) reduce permisos incluso si la cuenta también es coordinador: no incluye administración ni alumnos ajenos. Cada alumno y perfil adicional conserva su cuenta propia. El titular o responsable autorizado puede adquirir paquetes para esos perfiles.
- Los precios se almacenan en centavos MXN enteros. Los pedidos conservan una copia del producto: editarlo o desactivarlo no modifica pedidos ni saldos anteriores.
- Transferencia requiere comprobante PNG/JPG/PDF de hasta 2 MB; efectivo queda pendiente de confirmación. El pago en línea aparece como «Próximamente».
- Solo la confirmación acredita saldo o activa el plan. Confirmar repetidamente un pedido no duplica el crédito. Los ajustes manuales y las compras usan `operationId`; el cliente conserva ese ID durante los reintentos del mismo formulario.
- Los paquetes no caducan por defecto; pueden tener caducidad en días. Los planes duran los meses configurados desde su activación, con fechas locales y vencimiento exclusivo. Si el día no existe en el mes final se usa su último día.
- Los límites diarios, semanales (lunes a domingo) y por periodo se combinan. Tanto las clases reservadas como las consumidas cuentan para los límites.
- Al reservar se retiene una sesión. La asistencia o inasistencia la consume. La cancelación del alumno devuelve la sesión hasta el plazo configurado, inicialmente 24 horas; después la consume. Una cancelación del organizador devuelve una reserva sin aplicar ese plazo.
- Se usa primero un plan vigente. Si el plan no cubre el horario y está habilitado el pago por clase, se usa automáticamente el paquete disponible. No se pide una casilla de autorización; el modal informa qué modalidad se usará. Sin saldo o vigencia no se crea la reserva. Coordinación y entrenadores independientes pueden registrar una excepción con motivo.
- Los ajustes requieren motivo. Quitar clases solo afecta saldo libre, nunca sesiones retenidas. «Devolver clase» en Movimientos restaura una sesión consumida al paquete/plan original y sus contadores originales, conservando su vigencia.

## Datos y puntos de integración

`lib/payments/model.ts` define los contratos; `engine.ts` contiene reglas puras de fechas, prioridad, límites y consumo. `lib/server/payments/` concentra autorización, lecturas, transacciones y liquidación. `firebase/payments/main.ts` es la fachada cliente: usa la API autenticada porque estos movimientos requieren autorización y transacciones del servidor; los componentes no escriben a Firestore.

| Colección | Contenido |
| --- | --- |
| `paymentSettings` | Modalidades, cancelación, zona horaria y datos de transferencia por espacio |
| `paymentProducts` | Catálogo de paquetes y planes |
| `paymentParticipants` | Participantes de pagos independientes, incluso antes de su primera reserva |
| `paymentOrders` | Solicitudes, copia del producto, método, revisión y ruta privada de comprobante |
| `paymentAccounts` | Créditos/planes, vigencia y contadores retenidos/consumidos por alumno |
| `paymentReservations` | Retención única por espacio, alumno y reserva/clase; estado y fin de clase |
| `paymentMovements` | Historial de confirmaciones, ajustes, reservas, consumo y devoluciones |

Las colecciones nuevas permanecen bloqueadas al SDK cliente por las reglas Firestore existentes. Acceso exclusivamente mediante la API y Firebase Admin.

Para nuevos flujos de reserva/asistencia/cancelación, reutilizar `preparePaymentEvents(transaction, events)` dentro de la **misma transacción** que cambia la clase/reserva. Primero realiza todas las lecturas; devuelve una función que aplica las escrituras. No leer documentos después de empezar a escribir. `paymentTransaction` simplifica los casos sin una transacción previa. `bookingPaymentEvent` adapta reservas personales y antiguas reservas de escuela; las identidades de escuela se normalizan al alumno del padrón.

Los flujos integrados cubren creación de clases, aprobación/rechazo de solicitudes, incorporación de alumnos, asignación de horarios desde alumnos, asistencia, cancelaciones, cambios de horario y movimientos entre clases, así como reservas personales. Las transacciones de pagos reutilizan `runPaymentTransaction`, que añade un reintento acotado exclusivamente al error de transacción cerrada que el emulador devuelve durante contención; otros errores se propagan. Las aprobaciones de solicitudes usan una clave estable para no crear otra serie si se repite la misma aprobación.

No descontar saldo desde componentes, notificaciones o callbacks posteriores a una reserva: podría dejar reservas sin cargo o dobles descuentos. La API decide y devuelve códigos `payment_required`, `package_confirmation_required`, `payment_invalid` o `payment_limit` con mensajes seguros.

## Consultas y caché

Reutilizar `getAuthed` / `postAuthed` de `lib/client/authed-api.ts` y `PaymentCRUD`. El snapshot exacto de `/api/payments?schoolId=...` o `?coachId=...` se comparte durante 15 segundos, se aísla por usuario y se invalida al mutar. Ver también [data-fetching.md](data-fetching.md).

El snapshot trae cuentas en una lectura `getAll`, catálogo y listas masivas. No solicitar saldo/historial por fila. `paymentHistory` limita a 200 movimientos/pedidos recientes; para usuarios sin administración filtra los alumnos autorizados dentro de Firestore, en grupos de hasta 30. Las reservas consumidas devueltas por la API se limitan a 100 para la devolución manual. Los índices están declarados en `firestore.indexes.json` y vinculados en `firebase.json`.

La cuenta admite hasta 200 créditos/planes para mantener acotado el documento. No aumentar ese límite sin diseñar archivo de créditos antiguos y recuperación para devoluciones. La creación de series con pagos activos admite hasta 100 nuevas retenciones por operación; lotes mayores deben dividirse explícitamente. No fragmentar automáticamente una operación que debe ser atómica.

## Comprobantes privados y puesta en producción

`/api/payments/receipts` autentica cada carga/descarga y verifica espacio y titular del pedido o administrador. Los objetos viven en `paymentReceipts/<order>/<uuid>` sin tokens públicos. Se valida tipo, firma del archivo y tamaño. Las respuestas llevan `private, no-store` y `nosniff`; reemplazar el comprobante elimina el archivo anterior.

Antes de habilitar pagos en producción:

1. Publicar las reglas Storage actualizadas y los índices Firestore (`firebase deploy --only storage,firestore:indexes --project <proyecto>`). Las reglas excluyen `paymentReceipts/**` del acceso público general existente. **No activar comprobantes con las reglas públicas antiguas.**
2. Configurar `FIREBASE_STORAGE_BUCKET` o el `storageBucket` de `NEXT_PUBLIC_FIREBASE_CONFIG`, además de las credenciales Firebase Admin habituales.
3. Configurar `CRON_SECRET` privado en Vercel. `vercel.json` incluye `/api/payments/settle` a las 08:00 UTC diariamente. La ruta rechaza llamadas sin ese secreto.
4. Publicar la aplicación y habilitar la modalidad y catálogo de cada espacio.

La liquidación consume las retenciones cuya clase ya terminó, aunque no se haya registrado asistencia; es idempotente y procesa hasta 200 por ejecución. También ocurre al abrir Pagos para mantener el saldo actualizado entre ejecuciones. No duplica cargos cuando después se registra asistencia. No reconstruye consumos de reservas históricas sin retención.

Este cambio de código no publica automáticamente reglas, índices, secretos ni la aplicación.

## Validación

```sh
node --test scripts/tests/payments.test.mjs scripts/tests/request-performance.test.mjs
pnpm typecheck
pnpm exec playwright test e2e/payments.spec.ts e2e/attendance.spec.ts e2e/school-assignment-notifications.spec.ts e2e/coach-agenda-existing-student.spec.ts --workers=1
```

Playwright requiere la app conectada a Auth/Firestore/Storage locales (puertos 9099/8080/9199). Sus fixtures usan IDs exclusivos y solo escriben en emuladores; nunca ejecutar fixtures contra producción. Cubre permisos, confirmación concurrente, ajustes repetidos, comprobantes privados, retenciones, cancelación, inasistencia, devolución y formularios móviles. Las pruebas puras cubren meses, vigencia, límites combinados, respaldo y consumo idempotente.

La opción `allowBookingWithoutBalance` (desactivada por defecto) permite reservar cuando no hay créditos o un plan con sesiones disponibles. Si existe saldo, se descuenta normalmente; prioriza el plan y usa automáticamente el paquete como respaldo cuando ambas modalidades están activas. Sin saldo se registra una reserva de tipo `exception` con motivo de configuración, sin deuda ni descuento retroactivo. Solo el coordinador o entrenador independiente puede cambiarla.

Transferencias usa `transferDetails` con `bank`, `holder`, `account`, `clabe` y `reference`. Los valores son cadenas para conservar ceros iniciales; CLABE, si se proporciona, exige 18 dígitos. `transferInstructions` se conserva únicamente como compatibilidad de datos anteriores cuando todavía no existen campos estructurados.

Las solicitudes pendientes del atleta también validan saldo/vigencia antes de crearse (`createClassRequest` con opciones de facturación). Esta comprobación no retiene créditos; la aprobación vuelve a validar y reserva las clases realmente asignadas. `allowBookingWithoutBalance` es la única excepción configurada para solicitudes sin saldo cuando los pagos están habilitados.

El modal de inscripción del atleta reutiliza `GET /api/payments?...&view=student` a través de `getAuthed`, una consulta por escuela/entrenador al abrirse, nunca por alumno. Simula `reserveGrant` y `changeGrantUsage` en una copia del saldo para comprobar todos los horarios seleccionados sin mutar datos. Mientras verifica o si falta saldo, deshabilita el envío y muestra acceso a Pagos. La validación transaccional del servidor sigue siendo la autoridad.

Los comprobantes PNG/JPG de más de 2 MB se optimizan en el navegador antes de crear el pago: fondo blanco, JPEG con calidad inicial 90%, lado máximo de 2400 px y reducción progresiva solo cuando es necesaria para alcanzar 2 MB. Las imágenes pequeñas y los PDF no se recodifican; PDF conserva el límite de 2 MB. La preparación se reutiliza por archivo mediante WeakMap para evitar comprimir dos veces al validar y subir. El servidor sigue validando tamaño y firma del archivo resultante.
