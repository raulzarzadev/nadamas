# Reutilización de datos y consultas

Las pantallas autenticadas deben reutilizar `lib/client/authed-api.ts`. Usar `getAuthed` para lecturas y `postAuthed`, `putAuthed`, `patchAuthed` o `deleteAuthed` para cambios. Evitar `fetch` autenticados independientes y consultas a Firestore dentro de componentes. Los accesos directos existentes mediante dominios Firebase deben conservar sus wrappers.

## Caché compartida

`getAuthed(path)` comparte peticiones simultáneas a la misma URL, incluso entre componentes. Cada consumidor recibe un `Response` independiente y puede llamar a `response.json()`.

| Recurso | Vigencia en memoria |
| --- | --- |
| `/api/schools` | 60 segundos |
| `/api/schools/:id/students`, `classes`, `teachers`, `agenda` y sus subrutas | 15 segundos |
| `/api/coach/student-tags`, `/api/coach/students` | 15 segundos |
| Otras rutas | Solo comparte peticiones pendientes |

La clave incluye el usuario autenticado y la URL exacta, incluidos sus parámetros y su orden. Construir URLs de forma consistente para compartir lecturas. La caché tiene un límite de 128 entradas, vive solo en memoria y se limpia al cambiar de usuario. Las peticiones fallidas no se guardan. No sustituye los controles de acceso del servidor ni reduce el costo de la primera lectura a Firestore.

Para mostrar datos al volver a una pantalla, usar `getCachedAuthedData<T>(path)` como estado inicial y después llamar a `getAuthed(path)`. La primera función no realiza una petición y devuelve `undefined` si no hay datos vigentes del usuario actual. Tratar los objetos recibidos como compartidos: copiar antes de modificarlos. No mostrar un estado de carga vacío cuando ya hay datos disponibles.

`useSchoolSelection` aplica este patrón a escuelas y conserva la selección personal, de escuela o del tenant. Reutilizar ese hook en lugar de consultar escuelas por separado.

## Listas: cargar una vez y distribuir los datos

Para alumnos del entrenador, usar:

```ts
const response = await getAuthed(
  `/api/schools/${schoolId}/students?includeSummary=true&coachOnly=true`
)
const { students, summaries } = await response.json()
```

`summaries[studentId]` contiene `taken`, `scheduled` y `related`. El servidor filtra los alumnos según el entrenador y calcula los contadores con `getSchoolStudentSummaries` y `schoolStudentSummaries`. Reutilizar estas funciones para mantener las mismas reglas de asistencia, cancelación y deduplicación. No cargar el historial completo de cada alumno para pintar contadores. Consultar el historial cuando el usuario abre su detalle.

Para etiquetas de una lista, usar:

```ts
const response = await getAuthed(
  `/api/coach/student-tags?entity=students&schoolId=${encodeURIComponent(schoolId)}&view=list`
)
const { labels, assignments } = await response.json()
```

`assignments[studentId]` contiene los IDs de las etiquetas asignadas. `entity=teachers` utiliza el espacio de etiquetas de entrenadores y requiere permisos de coordinador. Los permisos internos mantienen el nombre `director`.

`StudentLabelTools` ya carga este recurso y lo comparte mediante `onData`. Pasar a cada `StudentLabels` de la lista `data={{ labels, selected: assignments[id] || [] }}` junto con `readOnly`. Pasar datos vacíos mientras se carga la lista evita que cada fila dispare su propia consulta. Reservar la consulta individual para perfiles o editores independientes.

## Guardar y actualizar

Los helpers de mutación invalidan la caché antes de la petición y al terminar, incluso si falla:

- Cambios en etiquetas invalidan las consultas de etiquetas de esa escuela.
- Cambios con alcance de escuela invalidan sus recursos, la lista de escuelas y las consultas de alumnos del entrenador.
- Cambios sin alcance de escuela invalidan toda la caché.

Invalidar no recarga automáticamente el estado React de componentes ya montados. Después de guardar, actualizar el estado local o activar el callback de recarga existente. La siguiente lectura mediante `getAuthed` obtendrá datos nuevos.

`useSchoolAgendaUpdates` invalida los recursos de escuela antes de ejecutar su callback al recibir cambios de agenda. Reutilizar este hook y el listener compartido de `AgendaUpdatesCRUD`; evitar crear un listener por fila. Si una operación usa otro mecanismo de escritura, llamar a `invalidateAuthedCache(path)` con su alcance y recargar los consumidores afectados. Para una ruta nueva, revisar tanto su vigencia como su invalidación antes de añadirla a la política de caché.

## Verificación

```bash
node --test scripts/tests/request-performance.test.mjs
pnpm typecheck
```

Las pruebas cubren deduplicación, expiración, errores, aislamiento por usuario, invalidación durante peticiones pendientes, permisos de etiquetas y contadores. Al modificar el patrón, mantener estas garantías y comprobar en Network que navegar o pintar filas no multiplique las consultas por alumno.
