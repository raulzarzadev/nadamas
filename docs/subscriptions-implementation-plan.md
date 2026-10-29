# Plan de implementación de suscripciones

Trabajo aislado: `feat/subscriptions-flow`, worktree `nadamas-subscriptions`.

## Reglas a implementar

Una suscripción por escuela, todos los profesores incluidos; una prueba de 15 días por propietario. Precio base $299 MXN mensual; códigos de admin ligados a escuela habilitan $49 mientras mantenga continuidad. Tres días de gracia al renovar. Reportar transferencia habilita acceso provisional en primera contratación, renovación y reactivación hasta confirmación o invalidación manual; el retraso de revisión nunca bloquea.

## Entregas y responsables

1. **Dominio y servidor (subscription_server):** modelos, cálculo de acceso/precio/periodos, pruebas, persistencia transaccional, autenticación, códigos, datos bancarios y verificación auditada.
2. **Restricciones (subscription_gates):** creación de escuela y prueba por propietario; bloquear nuevas reservas/alumnos/horarios/progreso/ventas en todos los caminos; conservar consulta, correcciones y compromisos previos.
3. **Interfaz (subscription_ui):** Suscripción por escuela, transferencia y referencia copiable, código promocional, administración de bancos/códigos/pagos; estados claros y formularios reutilizados.
4. **Integración y revisión (principal):** Stripe Checkout/renovación/webhook y cancelación; documentación operativa, migración y avisos; integración entre entregas y validación final.

## Orden y validación

Definir contratos compartidos antes de conectar componentes. Verificar tipos y pruebas puras, permisos, confirmaciones repetidas y límites temporales. Ejecutar pruebas de rendimiento existentes y pruebas de API/UI en emuladores cuando estén disponibles. Revisar especialmente transferencia provisional, precio tras cancelación y bloqueos por servidor. No ejecutar fixtures contra producción.

## Configuración externa

Tarjeta necesita proveedor configurado, claves secretas y webhook; transferencia necesita banco/beneficiario/CLABE configurados por admin. No inventar datos ni simular pagos exitosos. No desplegar ni migrar producción durante esta implementación. Documentar comandos y requisitos concretos pendientes.

## Avance

- Implementados dominio transaccional, APIs, prueba por propietario, promociones y transferencias auditadas.
- Implementadas pantallas de escuela/admin y restricciones en servidor, incluidos pagos de alumnos deshabilitados.
- Preparados Stripe Checkout, portal, cancelación/reanudación y webhook firmado; faltan credenciales/configuración y prueba real en sandbox.
- Preparados migración dry-run y avisos internos programados. El correo de recordatorios queda fuera de esta entrega.
- Las pruebas y limitaciones finales se registran en `subscriptions-operations.md`.


## Resultado de validación

- Compilación de producción completada con configuración local de Firebase y emuladores.
- Typecheck y Biome de archivos modificados aprobados.
- 54 pruebas de reglas, restricciones, Stripe, recordatorios y regresiones de pagos/caché aprobadas.
- Seis pruebas E2E aprobadas en emuladores: suscripciones, admin, pagos, asistencia, agenda de alumno existente y notificaciones de asignación.
- Pantallas y modales inspeccionados a 320 y 1440 px.
- Stripe no se probó con cobros reales ni credenciales sandbox; necesita configuración externa y conciliación de pagos promocionales tardíos antes de lanzamiento.
- Sin despliegue, publicación de reglas/índices ni migración de producción.


## Ampliación: escuelas exentas de pago

Implementada exención por escuela, exclusiva de admin, con motivo y auditoría. Incluye alta de registros para escuelas antiguas, bloqueo de nuevas compras mientras estén exentas, suspensión de avisos y cancelación de cobros recurrentes de Stripe antes de concederla. Retirarla conserva fechas y no reanuda cobros ni concede otra prueba.

Validación actualizada: 64 pruebas automatizadas de reglas/Stripe/caché/pagos aprobadas, typecheck y Biome aprobados; E2E de admin y suscripciones con concesión/revocación real en emuladores aprobados. Modal móvil inspeccionado. No desplegado.
