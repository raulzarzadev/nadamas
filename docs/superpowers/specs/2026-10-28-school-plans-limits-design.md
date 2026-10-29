# Planes de escuela: Básico con límites y Personalizado

Fecha: 2026-10-28 · Estado: borrador para aprobación

## Intención

Hoy nadamas cobra un solo plan: $299 MXN/mes por escuela, "todos sus profesores incluidos", sin límite de alumnos, con 15 días de prueba. Queremos poner un techo al plan de entrada para que las escuelas grandes, que cuestan más de atender, pasen a un trato a la medida negociado directamente con nosotros.

Éxito = una escuela chica no nota nada salvo los nuevos números; una escuela que crece choca con un mensaje claro de "Contáctanos", y nosotros podemos subirle los límites en un minuto desde admin.

## Planes (decidido por el usuario)

| Plan | Precio | Profes | Alumnos | Cómo se paga |
|---|---|---|---|---|
| **Básico** | $299 MXN/mes | 5 | 100 | En la app, como hoy (tarjeta / transferencia) |
| **Personalizado** | Cotizado | A la medida | A la medida | **Por fuera de la app** (transferencia/factura). En la app solo se suben los límites |

- Los planes "Profesional" e "Institucional" que se mencionaron **no existen**: se descartaron.
- **Prueba gratis de 30 días** (hoy 15) del plan Básico, para la primera escuela de cada propietario (la regla "una prueba por propietario" se mantiene, solo deja de anunciarse en pantalla).
- El **código promocional de $49 MXN/mes se mantiene** y aplica solo al Básico (mismos límites del Básico).

## Límites

- Se bloquea el **alta** que haría pasar el límite: el 6.º profe o el alumno 101. El servidor rechaza la operación; el cliente muestra "Llegaste al límite de tu plan Básico (5 profes / 100 alumnos). Contáctanos para un plan personalizado." con enlace a `/contacto`.
- Aplica en **todos** los caminos que activan una membresía (invitaciones aceptadas, solicitudes de acceso aprobadas, alta directa de alumnos, reservas o clases que inscriben, perfiles familiares, etc.). El builder debe encontrarlos todos (hay ~15 escrituras `status: 'active'` en `lib/server/*` y `app/api/schools/**`) y centralizar el chequeo en un helper transaccional para que dos altas simultáneas no pasen el límite.
- Reactivar a un miembro suspendido cuenta como alta.
- Durante la prueba aplican los mismos límites del Básico.

### Qué cuenta (decisión de Claude, revisable)
- **Alumno** = cada documento **activo de `schoolStudents`** (el padrón de nadadores de la escuela, `lib/server/school-students.ts`), no las membresías: muchos alumnos no tienen cuenta (hijos creados por el tutor, alumnos que el coach da de alta, alumnos restaurados desde la agenda, reservas `source: 'coach'`). Así un papá con 3 hijos inscritos suma 3. Pendientes y suspendidos no cuentan. Si varios documentos representan a la misma persona (vinculados o duplicados), cuentan una vez.
- **Profe** = cada membresía activa con rol `teacher`. El coordinador/propietario (`director`) no cuenta como profe, aunque también tenga rol teacher y dé clases.
- **El chequeo se aplica en toda escritura que deja activo un alumno o profe**, también las que no crean membresía: `createSchoolStudent`, `getOrRestoreSchoolAgendaStudent`, reservas del coach en agenda, solicitudes de clase, perfiles familiares, solicitudes de acceso, invitaciones.
- **Reactivar** un alumno o profe suspendido (en el padrón o en la membresía) cuenta como alta.
- **El bloqueo es por tipo:** si una escuela está pasada en profes, no puede agregar profes, pero sí alumnos mientras esté por debajo de 100 (y al revés).

### Escuelas que hoy ya pasan el límite (decidido por el usuario)
Siguen funcionando igual: nadie pierde acceso ni se da de baja a nadie. Ven un aviso persistente (en Ajustes / Suscripción y en el lugar donde se dan altas) pidiendo contactarnos. **Decisión de Claude:** mientras estén por encima del límite no pueden agregar más hasta que un admin les suba los límites.

### Escuelas exentas y legadas
- Escuelas `paymentExempt` sin límites personalizados: **decisión de Claude** — sin límite (hoy son tratos especiales; no romperlos).
- Escuelas legadas sin registro de suscripción: se rigen por el Básico (aplican los límites + el aviso si ya están por encima).

## Plan Personalizado (admin)

Desde la pantalla de admin de suscripciones (`components/subscriptions/AdminSubscriptions.tsx`, donde hoy se marca "exenta de pago") el admin puede activar **Personalizado** para una escuela: captura límite de profes, límite de alumnos y una nota/razón. La escuela queda exenta de pago en la app y con esos límites. Puede volver a Básico. Igual que el resto de admin, cada cambio guarda quién y cuándo.

Decisiones de Claude (revisables):
- Los dos límites del Personalizado son obligatorios y deben ser números enteros mayores que los del Básico (sin "ilimitado"); para algo enorme se pone un número alto.
- La opción "exenta de pago" que ya existe se queda como está, para tratos especiales, y sin límites. Activar Personalizado = exenta + límites propios. Volver a Básico quita los límites y la exención que puso el Personalizado.
- El chequeo de límites es un helper aparte de `assertSchoolSubscriptionAccess`, que se llama dentro de la misma transacción. Se lo saltan las escuelas exentas sin límites propios.
- La prueba se calcula al crear la suscripción (`lib/subscriptions/engine.ts`, `trialEndsAt = now + prueba`). Solo las suscripciones creadas después del cambio reciben 30 días.

## Textos y pantallas

- `/precio`: dos tarjetas — Básico ($299, 5 profes, 100 alumnos, 30 días gratis) y Personalizado ("Más de 5 profes o 100 alumnos · Contáctanos" → `/contacto`). Quitar "todos sus profesores incluidos" en todo el sitio.
- Home (`pricing-teaser`), FAQ, `llms.txt`, metadata de `/precio`, onboarding (`components/onboarding/setup-paths.ts`) y "Crea tu escuela" (checkbox "Suscripción básica gratis por 30 días · Ver suscripciones", ya existe y lee `NADAMAS_PRICING.trialDays`).
- Pantalla de Suscripción de la escuela: muestra plan actual y uso ("3 de 5 profes · 64 de 100 alumnos").
- Una sola fuente de números: `lib/pricing.ts` (precio, días de prueba, límites) y el motor (`lib/subscriptions/engine.ts`) deriva de ahí; hoy la prueba está duplicada (`SUBSCRIPTION_TRIAL_MS = 15 días` y `trialDays: 15`).

## Restricciones

- Las pruebas ya iniciadas conservan su `trialEndsAt` (se guarda al crearse; solo las nuevas reciben 30 días).
- Errores: nunca mostrar errores crudos (`lib/user-facing-error.ts`); el bloqueo por límite es un mensaje de negocio en español, no un error genérico.
- Copy en español, código en inglés. Biome, `pnpm typecheck`, e2e Playwright contra emuladores.
- Nada de Firestore directo desde componentes; límites aplicados en servidor.

## No-objetivos

- Cobro del Personalizado dentro de la app, facturación, Stripe para planes a la medida.
- Planes intermedios, autoservicio para cambiar de plan, límites por otras cosas (clases, ubicaciones, almacenamiento).
- Dar de baja o bloquear a escuelas existentes por pasarse.

## Lo que decide el builder

Modelo de datos (dónde guardar plan/límites, p. ej. en `SchoolSubscription`), forma exacta del helper de conteo y su uso transaccional, código de error para el cliente, UI exacta del aviso y de admin, y tests.
