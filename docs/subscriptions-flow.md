# Suscripciones de escuelas: definición acordada

Fecha: 2026-10-28. Implementación en `feat/subscriptions-flow`, worktree `nadamas-subscriptions`. Ver [plan](subscriptions-implementation-plan.md) y [operación](subscriptions-operations.md) para entregas, configuración y límites actuales.

## Suscripción, prueba y precio

- Una suscripción por escuela incluye a todos sus profesores. Activar el rol de profesor no cuesta ni inicia la prueba.
- El propietario recibe una única prueba de 15 días para su primera escuela, desde su creación, sin tarjeta. Las adicionales requieren pago desde el inicio. Borrar, recrear o transferir una escuela no reinicia la prueba.
- Precio normal: $299 MXN al mes por escuela.
- Admin genera códigos ligados a escuelas seleccionadas para activar $49 MXN al mes. No existe promoción automática de seis meses.
- El precio de $49 se conserva mientras mantenga continuidad. Cancelar y dejar terminar el periodo, o dejar vencer la gracia sin un pago válido, pierde el beneficio. Un nuevo código concedido por admin puede volver a habilitarlo.
- Reanudar antes de finalizar el periodo cancelado conserva el precio. Desactivar un código no retira silenciosamente un beneficio ya concedido.
- Contratar durante la prueba cobra en ese momento: al confirmar el pago termina la prueba y comienza el periodo pagado, sin acumular días restantes. Un intento de tarjeta fallido no termina la prueba.
- Cancelar renovación conserva el acceso hasta el fin del periodo pagado, sin gracia extra por cancelación voluntaria.
- Renovaciones con tarjeta o transferencia tienen 3 días de gracia con acceso completo desde el vencimiento. La prueba inicial no recibe gracia adicional.

El cobro del profesor independiente sigue fuera de este alcance. Su funcionamiento personal no debe bloquearse por la suscripción de una escuela.

## Acceso limitado

| Se conserva | Se bloquea |
| --- | --- |
| Entrar y consultar información autorizada | Nuevos alumnos e inscripciones |
| Agenda, clases confirmadas, saldo e historial propios del alumno | Nuevas reservas, aunque tenga saldo o un plan vigente |
| Asistencia de reservas existentes | Crear horarios, clases, series o extenderlas |
| Cancelar reservas y devolver clases según reglas existentes | Agregar alumnos o sesiones a compromisos existentes |
| Reprogramar una reserva conservando participantes y número de sesiones | Nuevas evaluaciones, progreso y planes |
| Corregir datos y registros existentes | Nuevas ventas de paquetes y mensualidades |
| Resolver pagos pendientes anteriores al vencimiento | Nuevas invitaciones y ampliación del equipo |
| Gestionar cuenta, privacidad, contacto y suscripción | Cualquier vía alternativa de crear las mismas operaciones |

Los registros y créditos no se borran. No descontar saldo por una reserva rechazada. La vigencia de los créditos mantiene sus reglas originales. Una corrección no puede convertirse en un alta encubierta. Las reservas confirmadas antes del vencimiento pueden atenderse aunque su fecha sea posterior.

Las restricciones se aplican por escuela y en servidor, también cuando los pagos de alumnos están deshabilitados. Una escuela vencida no bloquea otras escuelas ni la cuenta personal del alumno.

## Tarjeta

Stripe con renovación automática, checkout alojado y gestión de tarjeta/renovación. El servidor fija importe, moneda y escuela. Un retorno exitoso del navegador no acredita un pago: verificar eventos firmados y estado actual del proveedor, deduplicar entregas y conservar periodos pagados.

No permitir suscripciones duplicadas ni superponer checkout con una transferencia pendiente. Informar precio, periodicidad y fecha del próximo cobro antes de contratar. Las credenciales y el webhook se configuran fuera del código fuente.

## Transferencia y revisión manual

1. La escuela elige Transferencia. El servidor crea una solicitud con escuela, importe y referencia única por pago.
2. Mostrar banco, beneficiario, CLABE/cuenta, importe exacto y referencia bajo “Concepto de transferencia”; permitir copiar. La referencia bancaria es distinta del código promocional.
3. “Ya transferí” reporta el pago y habilita acceso completo provisional, tanto en primera contratación como en renovación y reactivación.
4. **La escuela sigue funcionando normalmente hasta que Zarza revise**, aunque pasen los 3 días de gracia. Reportar no registra el ingreso como confirmado ni fija un nuevo periodo pagado.
5. Zarza verifica el banco y confirma o invalida desde admin. Guardar fecha real de ingreso, fecha de revisión y administrador.
6. Confirmar formaliza un único periodo; repetir la confirmación no duplica nada. Si el ingreso llegó dentro del plazo, conserva los $49 aunque se revise después.
7. Invalidar retira el acceso provisional; conserva únicamente otra prueba, periodo pagado o gracia todavía vigentes. No permitir volver a reportar el mismo pago invalidado para recuperar acceso. Admin puede liberar el bloqueo para una nueva solicitud legítima.
8. Cada renovación requiere otra transferencia y una nueva referencia. Reabrir una solicitud pendiente conserva su referencia.

Un pago enviado fuera del plazo con importe promocional exige resolver la diferencia antes de confirmarlo. No modificar silenciosamente el importe recibido. Primera contratación/reactivación toma la fecha de ingreso verificado como inicio; una renovación anticipada se añade al periodo vigente, conservando sus días.

## Interfaz

Suscripción muestra escuela, estado, fecha exacta, importe y acciones autorizadas. El equipo ve el estado operativo; facturación y pagos quedan para propietario/admin. Al vencer, aviso no bloqueante y explicación clara de acciones restringidas, preservando formularios si el acceso cambia durante una edición.

Admin dispone de datos bancarios, códigos por escuela, estados de suscripción y cola de transferencias para confirmar/invalidar. Formularios en modales compartidos con acciones visibles y prevención de doble envío. No usar mensajes técnicos del proveedor en la interfaz.

## Lanzamiento y verificación

Las escuelas antiguas requieren migración idempotente desde una fecha anunciada, nunca desde su creación histórica. Preparar primero dry-run, verificar propietarios y publicar reglas junto con la aplicación. No se ejecuta migración ni despliegue de producción durante este trabajo.

Verificar expiración exacta, concurrencia al crear escuelas, permisos, códigos de otra escuela, bloqueo con saldo, reprogramación sin ampliaciones, transferencia provisional sin límite de revisión, invalidación, confirmación repetida, cobro fallido y reactivación. Los avisos internos se deduplican por escuela, vencimiento y hito.
