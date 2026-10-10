# Analytics y errores con PostHog

PostHog cubre marketing y aplicación. La clave pública y el host existentes se reutilizan. Los eventos identifican al usuario por su UID de Firebase y registran rol activo, entorno, versión y escuela del subdominio (`tenant_school_id`), sin nuevas consultas a Firestore. `school_selected` registra la escuela elegida en los filtros; no equivale a una propiedad global de todos los eventos posteriores.

## Activación

- Producción: `NEXT_PUBLIC_POSTHOG_KEY` y `NEXT_PUBLIC_POSTHOG_HOST` (`https://us.i.posthog.com` o `https://eu.i.posthog.com`). Las variables públicas deben existir **durante el build**.
- Desarrollo/emuladores: desactivado por defecto. Para probar con un proyecto de pruebas, añadir `NEXT_PUBLIC_POSTHOG_ENABLED=1` y reiniciar el servidor.
- Para desactivarlo, `NEXT_PUBLIC_POSTHOG_ENABLED=0`, tanto en build como en runtime del servidor.
- El servidor reutiliza la clave/host públicos; opcionalmente admite `POSTHOG_KEY` y `POSTHOG_HOST` privados.
- En el proyecto de PostHog, activar **Session Replay** y revisar las opciones de captura, retención y muestreo. El código prepara replay, pero no modifica ajustes remotos del proyecto.

## Eventos

| Evento | Utilidad |
| --- | --- |
| `$pageview`, `$pageleave`, `$autocapture` | Páginas visitadas y clics/envíos de formularios; URLs normalizadas y sin texto del elemento |
| Métricas automáticas del SDK | Rendimiento web, dispositivo, navegador y contexto de sesión, según soporte del navegador |
| `auth_session_started`, `login_attempt`, `login_success`, `login_failed`, `logout` | Sesiones autenticadas; los eventos `login_*` corresponden al flujo Google |
| `role_changed`, `school_selected` | Cambios de rol y selección explícita de escuela/espacio personal |
| `modal_opened`, `modal_closed` | Uso del componente compartido Sheet, con categoría del diálogo |
| `api_request_completed` | Método, ruta, estado HTTP, duración, resultado y código de correlación |
| `action_completed`, `action_failed` | Mutaciones que pasan por `authed-api` |
| `payment_<action>_succeeded/failed` | Compra, revisión, ajustes y demás operaciones de pagos |
| `payment_receipt_upload_succeeded/failed` | Carga de comprobantes, sin capturar el archivo |
| `booking_action_succeeded/failed` | Reservas, solicitudes y gestión de clases |
| `firebase_mutation_succeeded/failed`, `file_upload_succeeded` | Operaciones que pasan por FirebaseCRUD |
| `$exception` | Excepciones no controladas del navegador, límites de errores React, `reportInternalError`, fallos API de red/5xx y errores del servidor |

Las lecturas HTTP correctas de menos de 1.5 segundos se muestrean al 10%; se conservan todos los errores, solicitudes lentas y mutaciones. Los aciertos de caché no generan una nueva solicitud. No se instrumenta cada llamada directa a `fetch` ni cada helper antiguo de Firebase: las capturas centrales cubren las rutas que usan las capas compartidas. Las mutaciones indican que la API respondió correctamente; no implican aprobación de un pago pendiente.

Los errores de servidor no controlados pasan por `instrumentation.ts`. Los errores manejados de pagos y actualización de agenda se envían después de la respuesta con `after()`. Otros 5xx que recibe `authed-api` generan una excepción de cliente con ruta y estado; para disponer del diagnóstico original de un catch de servidor, usar `reportServerError(scope, error, request)`. Es posible ver un error de cliente y su error de servidor asociados al mismo `request_id`.

## Privacidad

- No se envían nombre ni correo en `identify`; se utiliza un UID, que sigue siendo un identificador seudónimo.
- Replay enmascara todos los textos e inputs y bloquea imágenes, canvas, videos, iframes y elementos `.ph-sensitive`, `.ph-no-capture` o `[data-analytics-private]`.
- No se graban consola, cuerpos ni cabeceras de red. Los eventos eliminan datos bancarios, comprobantes, archivos, texto de elementos, cuerpos de solicitudes y credenciales reconocidas.
- Las URLs de eventos y red se convierten en rutas sin queries, fragmentos ni IDs dinámicos. Las páginas de autenticación e invitaciones no se graban.
- Los mensajes y stacks de errores se filtran para retirar correos, Bearer tokens, secretos reconocidos y números largos. Un filtro no garantiza reconocer información sensible arbitraria: no incluir datos de alumnos, notas o información bancaria al construir errores o eventos.
- Las reglas se aplican a nuevos eventos; no borran los datos enviados anteriormente al proyecto PostHog. Revisar también captura IP/geolocalización y retención en la configuración remota.

## Mapas de código para errores de producción

El build integra `@posthog/nextjs-config` cuando existen **ambas** variables privadas:

```dotenv
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
# Opcional, host de la interfaz/API de gestión, no el host de ingesta:
POSTHOG_UI_HOST=https://us.posthog.com
```

El plugin requiere Node 20.20+ o 22.22+ según su rango de engines. La clave personal necesita acceso al proyecto y escritura de mapas de errores. No debe tener prefijo `NEXT_PUBLIC_`, entrar al repositorio ni imprimirse en logs. `pnpm-workspace.yaml` autoriza únicamente el instalador del CLI oficial necesario para los mapas. El plugin sube los mapas y los elimina de la salida publicada. Sin esas variables, el build funciona y los errores se capturan, pero sus stacks pueden permanecer minificados. No se ha verificado la subida sin credenciales de proyecto.

## Análisis sugeridos en el panel

1. **Uso**: usuarios activos diarios/semanales, retención y páginas más visitadas; desglosar por `active_role`, `tenant_school_id`, dispositivo y navegador.
2. **Compra**: embudo de apertura de modal de planes/pago → `payment_purchase_succeeded` → `payment_review_succeeded`. Filtrar acciones de revisión por resultado si se amplía su instrumentación; este último evento por sí solo no distingue aprobar de rechazar.
3. **Reservas**: solicitudes de clases y `booking_action_succeeded`, comparar con `booking_action_failed`, ruta, rol y estado HTTP.
4. **Errores**: frecuencia de `$exception` por `error_scope`, versión, navegador y usuario; enlazar replay y correlacionar cliente/servidor por `request_id`.
5. **Rendimiento**: percentiles 95/99 de `duration_ms` por ruta, filtrar lecturas lentas y separar mutaciones. El muestreo de lecturas rápidas sesga la distribución completa; no usarla para un p95 global sin compensar el muestreo.
6. **Fricción**: rage/dead clicks y sesiones que abren modales y no completan acciones.

Estos paneles/alertas son recetas; no se han creado remotamente ni se ha desplegado esta implementación. Al desplegar, comprobar en Live Events un acceso, una compra y un error de prueba, y confirmar que las propiedades y replay siguen enmascarados.

## Verificación local

```bash
pnpm typecheck
node --test scripts/tests/analytics.test.mjs scripts/tests/request-performance.test.mjs scripts/tests/payments.test.mjs
pnpm test:e2e e2e/payments.spec.ts --workers=1
pnpm build
```

Las pruebas de analytics usan SDKs simulados: comprueban privacidad, correlación, desactivación local y tolerancia a fallos sin enviar datos al proyecto real.

Documentación oficial: [Next.js](https://posthog.com/docs/libraries/next-js), [privacidad de replay](https://posthog.com/docs/session-replay/privacy), [mapas de código](https://posthog.com/docs/error-tracking/upload-source-maps/nextjs).
