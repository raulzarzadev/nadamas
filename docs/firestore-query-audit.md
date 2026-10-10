# Auditoría de consultas de Firestore — 2026-10-10

## Alcance y método

Se recorrieron con el parser TypeScript los usos de filtros y ordenamientos en `app`, `components`, `context`, `firebase` y `lib`: 162 llamadas a `where`/`orderBy`, agrupadas en 74 formas de consulta. Se revisaron manualmente las nueve construcciones dinámicas del informe y se añadieron sus variantes conocidas al inventario: historial de pagos, tipos de slug, evaluaciones, calendario, notificaciones y colecciones de limpieza de usuarios. Se conservaron también las consultas de los wrappers Firebase antiguos.

`node scripts/audit-firestore-queries.mjs` compara las consultas compuestas conocidas con `firestore.indexes.json` y enumera las construcciones dinámicas pendientes de resolución automática. Las pruebas señalan archivos nuevos con consultas dinámicas para revisión. Es un análisis estático con expansiones manuales; no demuestra por sí solo todos los valores posibles en tiempo de ejecución.

Se consultaron los índices remotos con acceso de lectura: **32 índices, todos READY**. También se enviaron las 74 formas a **Query Explain con `analyze: false`**, usando valores ficticios: no se recuperaron documentos de alumnos ni se modificó producción. Resultado: 72 planes válidos; las dos consultas nuevas de liquidación necesitan los índices añadidos en esta revisión.

Los filtros simples y las combinaciones de igualdad existentes usan índices automáticos/mezcla de índices. Los historiales de pagos combinan ámbito, alumno opcional, estado y ordenamiento; sus seis variantes tienen índices declarados. La consulta antigua de posts por equipo y fecha también conserva su índice. No se eliminaron los 25 índices históricos que existían fuera del archivo local.

## Correcciones

1. **Liquidación de pagos**: el límite de 200 se aplicaba antes de excluir reservas ya consumidas o liberadas. Con suficientes registros antiguos, las reservas pendientes podían quedar sin procesar indefinidamente. Ahora `state == reserved` se filtra en Firestore antes del límite, tanto por escuela/coach como en la tarea global. Se añadieron dos índices:
   - `paymentReservations`: `state ASC`, `endsAt ASC`.
   - `paymentReservations`: `scope ASC`, `state ASC`, `endsAt ASC`.
2. **Reglas superpuestas**: un `allow false` específico no cancelaba el `allow` de la regla genérica. Se excluyeron de esa regla los datos de pagos, OTP, reservas, comentarios, etiquetas y otras colecciones que se manejan mediante APIs autenticadas. Los perfiles y coaches también quedan sujetos a sus reglas específicas.
3. **Roles**: un usuario puede actualizar su perfil y activar coach, pero no asignarse `roles.admin`. Un administrador existente conserva la gestión de roles.
4. **Notificaciones**: las consultas por `recipientId` y `actorId` funcionan para su usuario; se rechazan lecturas de notificaciones ajenas y escrituras directas.
5. **Escuelas**: las lecturas privadas por membresía requieren estado activo.
6. **Publicaciones públicas**: `entries` admite el campo `options.isPublic` que utiliza su consulta, conservando compatibilidad con el campo raíz antiguo.

Los permisos de las APIs con Firebase Admin se verifican en el servidor; estas reglas protegen el acceso directo de clientes y no sustituyen los controles de rol de las rutas.

## Validación

- Planificación real de consultas en producción: 72 consultas anteriores válidas; dos nuevas necesitan desplegar sus índices.
- Pruebas de lógica, acceso, caché, identidad, asistencia, pagos y reglas en emuladores: 63 aprobadas.
- Pruebas nuevas: índices compuestos, lotes `in` de 30 alumnos, aislamiento de escuela, límite global del historial, liquidación detrás de más de 200 reservas procesadas y lecturas permitidas/denegadas con tokens de clientes reales del emulador.
- Suite completa inicial de navegador: 39 de 46 aprobadas. Las fallas no fueron de índices: había rutas/textos/controles desactualizados en las pruebas, una expectativa sobre horarios recurrentes legacy y un desbordamiento horizontal a 320 px. No debe interpretarse esta auditoría como validación completa de toda la UI.
- Revalidación dirigida: directorio de entrenadores y tres pruebas de vinculación OTP aprobadas. Persisten fallos en historial de adicionales y evaluación móvil; no se relajaron sus verificaciones de negocio. Se actualizaron expectativas antiguas de navegación al progreso, título del directorio y dependencias de las pruebas de asistencia.
- TypeScript, Biome sobre los archivos revisados y compilación de producción: aprobados.

```bash
node scripts/audit-firestore-queries.mjs
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --test scripts/tests/*.test.mjs
pnpm typecheck
pnpm test:e2e --workers=1
```

## Pendiente en producción

Esta revisión no despliega ni elimina recursos. Antes de publicar el cambio de liquidación, crear los dos índices y esperar a que estén READY; desplegar también las reglas corregidas:

```bash
pnpm exec firebase deploy --only firestore:indexes,firestore:rules --project nadamas-b1ecf
```

El archivo contiene 34 índices: los 32 existentes y los dos nuevos. Las correcciones de seguridad solo protegen producción una vez desplegadas.

Referencias oficiales: [índices y mezcla de filtros de igualdad](https://firebase.google.com/docs/firestore/query-data/index-overview), [Query Explain](https://firebase.google.com/docs/firestore/query-data/explain-query-performance), [superposición de reglas](https://firebase.google.com/docs/firestore/security/rules-structure#overlapping_match_statements).
