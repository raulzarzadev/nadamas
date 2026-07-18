# Simplified student progress capture — design

Date: 2026-07-17
Status: approved (pending spec review)

## Goal

Registrar el progreso de un alumno debe tomar **3 clicks + guardar**, con una nota
de texto opcional. Se elimina el formulario actual de 5 campos.

Las tres dimensiones (por ahora numéricas, en el futuro con títulos e iconos
configurables):

| Dimensión  | Valores | Semántica                                          |
| ---------- | ------- | -------------------------------------------------- |
| Nivel      | 1–4     | Etapa del alumno                                   |
| Avance     | 1–4     | Subnivel dentro del nivel (nivel 3 + avance 2 = 3.2) |
| Resultado  | 1–4     | Resultado de la sesión: 😢 triste, 😠 enojado, 😐 neutro, 😊 feliz |

## Decisions (approved)

- **Campos viejos:** `goal` y `nextFocus` se eliminan del modal, de los tipos de
  input y del normalizador. Quedan huérfanos en docs viejos de Firestore
  (ignorados). Niveles string viejos se migran por mapeo en lectura.
- **Avance = subnivel** del nivel, no métrica independiente.
- **Config global:** la escala (labels, emojis) vive en `CONSTANTS/`; no hay
  personalización por coach todavía.
- **Nombre de campo persistido:** se mantiene `coachAssessment` en Firestore y en
  los tipos para el subnivel. Sin renombre de campo.

## Data model

`lib/coach-student-progress.ts`:

- `level: number` (1–4) — reemplaza el union de strings. `STUDENT_LEVELS` (los 5
  strings) desaparece de la API pública; queda solo un mapa interno de migración:
  `Inicial→1, Básico→2, Intermedio→3, Avanzado→4, Competitivo→4`.
- `coachAssessment: number` (1–4) — subnivel. Antes 1–5; el clamp pasa a máx 4.
- `result: number` (1–4) — **nuevo**, en `StudentProgressEntry` y como último
  resultado en `StudentProgress`.
- `note`/`lastNote`: sin cambios (opcional, máx 800).
- `goal`, `nextFocus`: se eliminan de `StudentProgress`, `StudentProgressEntry`,
  `StudentProgressInput` y `normalizeStudentProgressInput`.
- `normalizeStudentProgressInput`: acepta `level` como número o string legacy
  (aplica el mapa), clamp 1–4; clamp `coachAssessment` 1–4; valida `result` 1–4
  (default 3 = neutro si falta/ inválido).
- Normalización en lectura: donde se lea un `StudentProgress` con `level` string
  (docs viejos), se pasa por el mismo mapa antes de mostrar. Sin script de
  migración; los docs se corrigen al siguiente guardado.

## Scale constants

Nuevo `CONSTANTS/PROGRESS_SCALE.ts`:

```ts
export const PROGRESS_LEVELS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]
export const PROGRESS_SUBLEVELS = [ /* idem 1–4 */ ]
export const PROGRESS_RESULTS = [
  { value: 1, label: 'Triste', emoji: '😢' },
  { value: 2, label: 'Enojado', emoji: '😠' },
  { value: 3, label: 'Neutro', emoji: '😐' },
  { value: 4, label: 'Feliz', emoji: '😊' },
]
```

Cambiar títulos/iconos en el futuro = editar este archivo. La UI solo consume
estas constantes, nunca hardcodea valores.

## UI — `StudentProgressModal`

Tres filas de botones tipo pill (min-h-12, táctiles):

```
Nivel      [1] [2] [3] [4]
Avance     [1] [2] [3] [4]
Resultado  [😢] [😠] [😐] [😊]   (label pequeño debajo de cada emoji)

Nota (opcional)  [textarea compacta]

[Guardar progreso]
[Cancelar]
```

- Pre-selección: `level` y `coachAssessment` actuales del alumno (con mapeo
  legacy si vienen como string). `result` inicia **sin selección** — es la
  evaluación de esta sesión.
- Guardar deshabilitado hasta elegir Resultado.
- Se eliminan: select de nivel, input numérico de avance, inputs de objetivo y
  próximo foco.
- Botones seleccionados: fondo `--c-ocean`, texto blanco; no seleccionados:
  borde `--c-border`. Accesible: `role="radiogroup"` por fila, `aria-checked`.

## API

- `PATCH /api/coach/students` (`route.ts:326`): pasa `result` al entry y al doc;
  defaults nuevos (`level: 1`, `coachAssessment: 1`); deja de escribir
  `goal`/`nextFocus`.
- `app/api/coach/agenda/bookings/route.ts:140`: default `level: 'Inicial'` →
  `level: 1`.
- `GET /api/athlete/progress`: sin cambios estructurales; sirve los entries con
  los campos nuevos.

## Views

- `app/(app)/athlete/progress/page.tsx`: mostrar `Nivel 3.2` (nivel.avance),
  emoji de resultado por entry; el promedio `coachAssessment/5` pasa a `/4`.
- `components/coach/CoachStudents.tsx` (líneas 226–228, 416): resumen
  `Nivel 3.2`; historial `3.2 · 😊` usando `PROGRESS_SCALE`.
- Cualquier lectura de `level` aplica el mapeo legacy antes de renderizar.
- Entries viejos sin `result`: no se renderiza emoji (campo ausente ≠ neutro).

## Error handling

Sin cambios de patrón: errores de guardado → `reportInternalError` + mensaje
genérico en español (estándar del repo).

## Testing

- `pnpm typecheck` + `pnpm check`.
- Verificación manual del flujo (emulator, login coach): abrir modal, 3 clicks,
  guardar, ver el entry en historial coach y en la vista del alumno; comprobar
  que un alumno con `level: 'Intermedio'` viejo se muestra y pre-selecciona
  como 3.
- E2e existente que toque progreso (si hay) se actualiza.

## Addendum (2026-07-18): nivel = promedio de últimas 5 sesiones

El `level`/`coachAssessment` del doc `StudentProgress` NO es el último click:
al guardar, el PATCH recalcula la posición como el promedio de las últimas 5
entries (incluida la nueva) sobre la escala combinada 1–16
(`(nivel−1)·4 + avance`), redondeado hacia arriba (`Math.ceil`), y lo convierte
de vuelta a `nivel.avance`. La entry sí conserva los valores clickeados.
Implementado en `computeStudentPosition` (`lib/coach-student-progress.ts`).

## Out of scope

- Personalización por coach de la escala.
- Script de migración de datos (mapeo en lectura lo cubre).
- Iconos/logos custom (solo emoji por ahora).
