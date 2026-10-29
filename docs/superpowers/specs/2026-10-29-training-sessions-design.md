# Sesiones sueltas de entrenamiento

Fecha: 2026-10-29 · Estado: borrador para aprobación

## Intención

Hoy un entrenador solo puede publicar planeaciones completas (MACRO → MESO → MICRO). Muchas veces lo que quiere compartir es **una sola sesión**: "4×200 libre a 3:00, 8×50 patada". Queremos que la cree en segundos, que quede **pública por defecto** y que cualquiera —alumnos y profes, de su escuela o de fuera— la encuentre y la **use**: en sus clases, en sus planeaciones o simplemente para hacerla.

Éxito = un profe crea y publica una sesión en menos de un minuto; otro profe la encuentra en el buscador de Entrenos y la mete en la nota de su clase o en un día de su planeación con un toque.

## Qué es una sesión (decidido por el usuario)

- La crea un **entrenador** desde **Entrenos** (pestaña del menú inferior).
- Campos: **título**, **descripción**, **fecha** y el entreno en **bloques y series** (el mismo editor de las notas de clase, `ClassTrainingEditor`).
- **Pública por defecto**; se puede volver privada.
- **Buscable por todos**: en nadamas.app el buscador de Entrenos muestra sesiones públicas de cualquier profe. Dentro de la app de una escuela (subdominio) solo las de los profes de esa escuela, igual que ya pasa con los planes.
- **Se reutiliza**: el autor y cualquier otro profe o alumno la puede usar en otras clases ("eventos") y planeaciones.

## Decisiones de Claude (revisables)

- **Fecha opcional.** Una sesión publicada para reusar no siempre tiene fecha; si la tiene, se muestra en la tarjeta.
- **Título obligatorio**, descripción opcional, al menos un bloque con una serie para guardar.
- **Usar = copiar.** Al usarla en una clase o planeación se copia su contenido; editar la copia no cambia la original, y si el autor la cambia o la borra, las copias siguen intactas. (Evita que el cambio de un tercero altere tu clase de mañana.)
- **Dónde se usa:**
  - **Nota de clase** (`ClassNotesModal` / `ClassTrainingEditor`): botón "Usar una sesión" que abre el buscador de sesiones y reemplaza o agrega los bloques.
  - **Planeación** (`ObjectiveWorkouts` en un MICRO-ciclo): opción "Desde una sesión" junto al importar existente (`WorkoutTransferSheet`), que agrega la sesión como un entreno del día.
  - **Alumno**: ve la sesión completa (bloques, series, tiempo estimado) y puede **guardarla** en sus entrenos para tenerla a mano. Guardar = copia propia, privada.
- **Colección propia `trainingSessions`**, separada de `trainingPlans` (una sesión no tiene ciclos y sus reglas de validación son distintas). Campos: `userId`, `createdAt`, `updatedAt`, `title`, `description`, `date?`, `blocks`, `visibility` (`public` por defecto), `author` (nombre, foto, rol, para la tarjeta sin leer el perfil).
- **Reglas Firestore:** dueño crea/edita/borra; cualquiera con sesión lee las públicas; el dueño lee las suyas. Agregar `trainingSessions` al deny-list `isLegacyCollection`. Validar tamaño (mismos límites que `normalizeClassTraining`: ≤ 20 bloques).
- **Buscador:** la pestaña **Entrenos** del buscador lista planes y sesiones juntos; la tarjeta de sesión dice "Sesión" y muestra autor, fecha (si hay), distancia total y tiempo estimado. "Verificado" igual que en planes.
- **En Entrenos del entrenador:** arriba "Crear entreno" (planeación, como hoy) y "Crear sesión"; abajo sus sesiones en una lista "Mis sesiones" con estado Pública/Privada.
- **Atleta:** no crea sesiones públicas (solo los entrenadores publican); sí guarda copias.

## Restricciones

- Firestore solo vía clase `FirebaseCRUD` (`firebase/training-sessions/main.ts`), nunca directo desde componentes.
- Errores: nunca crudos (`lib/user-facing-error.ts`).
- Copy en español, código en inglés. Biome, `pnpm typecheck`, e2e Playwright contra emuladores.
- Las reglas nuevas se despliegan a mano (`firestore.rules`), como siempre.

## No-objetivos

- Comentarios, likes o ranking de sesiones.
- Asignar una sesión a un alumno concreto (eso era la otra opción, descartada por ahora).
- Sincronizar copias con la original.
- Importar sesiones de otras apps o relojes.

## Lo que decide el builder

Forma exacta de la tarjeta y la vista de detalle, ruta de detalle (p. ej. `/athlete/training/session/[id]` y su equivalente coach), cómo se reemplaza vs. agrega en la nota de clase, nombres de componentes y tests.
