# Simplified Student Progress Capture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar progreso de un alumno en 3 clicks (Nivel 1–4, Avance 1–4, Resultado 1–4 con emoji) + nota opcional, reemplazando el formulario de 5 campos.

**Architecture:** Se reusa el schema Firestore actual (`coachStudentProgress` / `coachStudentProgressEntries`). `level` pasa de string a número con mapeo legacy en lectura; `coachAssessment` se mantiene como nombre de campo para el subnivel (clamp 1–4); se agrega `result`. La escala (labels/emojis) vive en `CONSTANTS/PROGRESS_SCALE.ts` y la UI solo consume esas constantes.

**Tech Stack:** Next.js 16 App Router, React 19, Firebase Admin (API routes), TypeScript strict, Tailwind v4, Biome.

**Spec:** `docs/superpowers/specs/2026-07-17-simplified-student-progress-design.md`

## Global Constraints

- No hay unit test runner en el repo; la verificación por task es `pnpm typecheck` + `pnpm check`, y verificación manual del flujo al final (emulator).
- Errores de UI: nunca exponer `error.message`; usar `reportInternalError` + `GENERIC_USER_ERROR` (ya lo hace el modal).
- Copy de UI en español; código y rutas en inglés.
- Campo persistido del subnivel se llama `coachAssessment` — NO renombrar.
- Mapeo legacy: `Inicial→1, Básico→2, Intermedio→3, Avanzado→4, Competitivo→4`.
- `result` es opcional en los tipos (entries viejos no lo tienen); ausente = no se muestra emoji.
- Formato visual de posición: `nivel.subnivel` (ej. `3.2`).

---

### Task 1: Escala en CONSTANTS y modelo/normalizador en lib

**Files:**
- Create: `CONSTANTS/PROGRESS_SCALE.ts`
- Modify: `lib/coach-student-progress.ts` (rewrite completo)

**Interfaces:**
- Produces (consumido por Tasks 2–4):
  - `PROGRESS_LEVELS`, `PROGRESS_SUBLEVELS`: `{ value: number; label: string }[]`
  - `PROGRESS_RESULTS`: `{ value: number; label: string; emoji: string }[]`
  - `progressResultEmoji(value: number | undefined): string` (`''` si no hay match)
  - `normalizeLevelValue(value: unknown): number` — string legacy o número → 1–4 (default 1)
  - `clampScale(value: unknown, fallback: number): number` — 1–4
  - `formatStudentLevel(item: { level: unknown; coachAssessment: unknown }): string` — `"3.2"`
  - `normalizeStudentProgressInput(input): { level: number; coachAssessment: number; result: number; lastNote: string }`
  - Tipos `StudentProgress`, `StudentProgressEntry` (con `level: number`, `result?: number`, sin `goal`/`nextFocus`), `StudentProgressInput`
  - `studentProgressId(coachId, athleteId)` sin cambios

- [ ] **Step 1: Crear `CONSTANTS/PROGRESS_SCALE.ts`**

```ts
export interface ProgressScaleOption {
  value: number
  label: string
  emoji?: string
}

export const PROGRESS_LEVELS: ProgressScaleOption[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

export const PROGRESS_SUBLEVELS: ProgressScaleOption[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

export const PROGRESS_RESULTS: Required<ProgressScaleOption>[] = [
  { value: 1, label: 'Triste', emoji: '😢' },
  { value: 2, label: 'Enojado', emoji: '😠' },
  { value: 3, label: 'Neutro', emoji: '😐' },
  { value: 4, label: 'Feliz', emoji: '😊' },
]

export function progressResultEmoji(value: number | undefined) {
  return PROGRESS_RESULTS.find((item) => item.value === value)?.emoji || ''
}
```

- [ ] **Step 2: Reescribir `lib/coach-student-progress.ts`**

Contenido completo del archivo:

```ts
/** Legacy string levels stored before the numeric 1-4 scale. */
const LEGACY_LEVEL_MAP: Record<string, number> = {
  Inicial: 1,
  Básico: 2,
  Intermedio: 3,
  Avanzado: 4,
  Competitivo: 4,
}

export interface StudentProgress {
  id: string
  coachId: string
  athleteId: string
  athleteName: string
  athleteEmail: string | null
  athletePhone?: string
  athleteAddress?: string
  athleteLocation?: string
  /** 1-4. Legacy docs may still hold a string; normalize with normalizeLevelValue. */
  level: number
  /** Sub-level 1-4 (field name kept for data compatibility). */
  coachAssessment: number
  /** Last session result 1-4; absent on docs saved before this field existed. */
  result?: number
  lastNote: string
  createdAt: number
  updatedAt: number
}

export interface StudentProgressInput {
  level?: unknown
  coachAssessment?: unknown
  result?: unknown
  lastNote?: unknown
}

/** One timestamped progress record in a student's history. */
export interface StudentProgressEntry {
  id: string
  coachId: string
  athleteId: string
  level: number
  coachAssessment: number
  result?: number
  note: string
  createdAt: number
}

export function studentProgressId(coachId: string, athleteId: string) {
  return `${coachId}_${athleteId}`
}

export function clampScale(value: unknown, fallback: number) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.min(4, Math.max(1, Math.round(score)))
}

export function normalizeLevelValue(value: unknown): number {
  if (typeof value === 'string' && value in LEGACY_LEVEL_MAP) return LEGACY_LEVEL_MAP[value]
  return clampScale(value, 1)
}

/** Renders the combined position, e.g. level 3 + sub-level 2 -> "3.2". */
export function formatStudentLevel(item: { level: unknown; coachAssessment: unknown }) {
  return `${normalizeLevelValue(item.level)}.${clampScale(item.coachAssessment, 1)}`
}

export function normalizeStudentProgressInput(input: StudentProgressInput) {
  return {
    level: normalizeLevelValue(input.level),
    coachAssessment: clampScale(input.coachAssessment, 1),
    result: clampScale(input.result, 3),
    lastNote: limitText(input.lastNote, 800),
  }
}

function limitText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
```

Nota: `STUDENT_LEVELS`, `StudentLevel` y los campos `goal`/`nextFocus` desaparecen a propósito. El typecheck fallará en los consumidores hasta terminar Tasks 2–4 — esperado; NO commitear todavía.

- [ ] **Step 3: Verificar que typecheck falla solo en los consumidores esperados**

Run: `pnpm typecheck`
Expected: errores SOLO en `app/api/coach/students/route.ts`, `app/api/coach/agenda/bookings/route.ts`, `components/coach/StudentProgressModal.tsx`, `components/coach/CoachStudents.tsx`, `app/(app)/athlete/progress/page.tsx`. Cualquier otro archivo con error = consumidor no mapeado; revisar antes de seguir.

(No commit en esta task; se commitea al final de Task 2 cuando el typecheck pasa.)

---

### Task 2: API routes

**Files:**
- Modify: `app/api/coach/students/route.ts` (POST líneas ~154–168, PUT ~226–242, PATCH ~304–332)
- Modify: `app/api/coach/agenda/bookings/route.ts` (~133–147)

**Interfaces:**
- Consumes (Task 1): `normalizeStudentProgressInput`, `normalizeLevelValue`, `clampScale`, tipos nuevos.
- Produces: PATCH `/api/coach/students` responde `{ progress, entry }` donde `entry` incluye `result: number` y ya no incluye `goal`/`nextFocus`.

- [ ] **Step 1: `app/api/coach/students/route.ts` — actualizar imports**

```ts
import {
  clampScale,
  normalizeLevelValue,
  normalizeStudentProgressInput,
  type StudentProgress,
  type StudentProgressEntry,
  type StudentProgressInput,
  studentProgressId,
} from '@/lib/coach-student-progress'
```

- [ ] **Step 2: POST — defaults del doc nuevo (líneas ~154–168)**

Reemplazar el objeto `progress` por:

```ts
const progress: StudentProgress = {
  id,
  coachId,
  athleteId,
  athleteName: name,
  athleteEmail: email || null,
  ...(phone ? { athletePhone: phone } : {}),
  level: 1,
  coachAssessment: 1,
  lastNote: '',
  createdAt: now,
  updatedAt: now,
}
```

- [ ] **Step 3: PUT — preservar progreso normalizando legacy (líneas ~226–242)**

Reemplazar el objeto `progress` por:

```ts
const progress: StudentProgress = {
  id,
  coachId,
  athleteId,
  athleteName: details.name,
  athleteEmail: details.email || null,
  athletePhone: details.phone,
  athleteAddress: details.address,
  athleteLocation: details.location,
  level: normalizeLevelValue(current?.level),
  coachAssessment: clampScale(current?.coachAssessment, 1),
  // Firestore rejects `undefined`; only include result when the doc has one.
  ...(current?.result ? { result: current.result } : {}),
  lastNote: current?.lastNote || '',
  createdAt: current?.createdAt || now,
  updatedAt: now,
}
```

- [ ] **Step 4: PATCH — entry con `result`, sin `goal`/`nextFocus` (líneas ~321–332)**

El objeto `progress` del PATCH no cambia (el spread `...normalized` ya trae `level`, `coachAssessment`, `result`, `lastNote`). Reemplazar el objeto `entry` por:

```ts
const entry: StudentProgressEntry = {
  id: entryRef.id,
  coachId,
  athleteId: body.athleteId,
  level: normalized.level,
  coachAssessment: normalized.coachAssessment,
  result: normalized.result,
  note: normalized.lastNote,
  createdAt: now,
}
```

- [ ] **Step 5: `app/api/coach/agenda/bookings/route.ts` — default del doc auto-creado (~133–147)**

Reemplazar dentro del objeto `progress`:

```ts
      level: 1,
      coachAssessment: 1,
      lastNote: '',
```

(eliminando `level: 'Inicial'`, `goal: ''`, `nextFocus: ''`.)

- [ ] **Step 6: Verificar**

Run: `pnpm typecheck`
Expected: errores restantes SOLO en los 3 archivos de UI (modal, CoachStudents, athlete progress page). Los dos routes ya sin errores.

(Commit al final de Task 4, cuando el typecheck pasa completo. Si se prefiere commit por task, este estado intermedio no compila — por eso lib+API+UI se commitean juntos en Task 4 Step 5.)

---

### Task 3: `StudentProgressModal` — 3 clicks + nota

**Files:**
- Modify: `components/coach/StudentProgressModal.tsx` (rewrite del contenido del form; shell del dialog/overlay se conserva)

**Interfaces:**
- Consumes: `PROGRESS_LEVELS`, `PROGRESS_SUBLEVELS`, `PROGRESS_RESULTS` de `CONSTANTS/PROGRESS_SCALE`; `normalizeLevelValue`, `clampScale`, tipos de `lib/coach-student-progress`; `patchAuthed` (sin cambios).
- Produces: mismo contrato `onSaved(entry, progress)`; PATCH body ahora `{ athleteId, level, coachAssessment, result, lastNote }`.

- [ ] **Step 1: Reescribir el componente**

Contenido completo del archivo:

```tsx
'use client'

import { useKeyboardSafeArea } from '@comps/hooks/useKeyboardSafeArea'
import { useState } from 'react'
import {
  PROGRESS_LEVELS,
  PROGRESS_RESULTS,
  PROGRESS_SUBLEVELS,
  type ProgressScaleOption,
} from '@/CONSTANTS/PROGRESS_SCALE'
import { patchAuthed } from '@/lib/client/authed-api'
import {
  clampScale,
  normalizeLevelValue,
  type StudentProgress,
  type StudentProgressEntry,
} from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function StudentProgressModal({
  athleteId,
  studentName,
  initial,
  onClose,
  onSaved,
}: {
  athleteId: string
  studentName: string
  initial?: StudentProgress | null
  onClose: () => void
  onSaved: (entry: StudentProgressEntry, progress: StudentProgress) => void
}) {
  // Level/avance carry the student's current state as a starting point; the
  // session result starts unselected because it grades this session only.
  const [level, setLevel] = useState(() => normalizeLevelValue(initial?.level))
  const [subLevel, setSubLevel] = useState(() => clampScale(initial?.coachAssessment, 1))
  const [result, setResult] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const keyboardSafeArea = useKeyboardSafeArea()

  async function save() {
    if (result === null) return
    setStatus('saving')
    try {
      const response = await patchAuthed('/api/coach/students', {
        athleteId,
        level,
        coachAssessment: subLevel,
        result,
        lastNote: note,
      })
      const payload = (await response.json()) as {
        progress: StudentProgress
        entry: StudentProgressEntry
      }
      onSaved(payload.entry, payload.progress)
    } catch (err) {
      reportInternalError('COACH_STUDENT_PROGRESS_SAVE', err)
      setStatus('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Agregar progreso de ${studentName}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm"
      style={keyboardSafeArea ? { paddingBottom: `calc(${keyboardSafeArea}px + 1rem)` } : undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-(--c-border) sm:hidden" />
        <div>
          <h3 className="text-xl font-bold text-(--c-ocean)">Agregar progreso</h3>
          <p className="mt-0.5 text-sm text-(--c-text-2)">{studentName}</p>
        </div>

        <ScaleRow
          label="Nivel"
          options={PROGRESS_LEVELS}
          selected={level}
          onSelect={setLevel}
        />
        <ScaleRow
          label="Avance"
          options={PROGRESS_SUBLEVELS}
          selected={subLevel}
          onSelect={setSubLevel}
        />
        <ScaleRow
          label="Resultado"
          options={PROGRESS_RESULTS}
          selected={result}
          onSelect={setResult}
        />

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Nota (opcional)
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={800}
            rows={2}
            placeholder="Observaciones de la sesión."
            className="rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 py-2 text-sm text-(--c-ocean)"
          />
        </label>

        {status === 'error' && (
          <p className="text-sm text-(--c-error,#b91c1c)">{GENERIC_USER_ERROR}</p>
        )}

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={status === 'saving' || result === null}
            className="min-h-12 rounded-full bg-(--c-ocean) font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === 'saving' ? 'Guardando…' : 'Guardar progreso'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full font-semibold text-(--c-text-2) hover:text-(--c-ocean)"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function ScaleRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: ProgressScaleOption[]
  selected: number | null
  onSelect: (value: number) => void
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="text-sm font-semibold text-(--c-ocean)">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-2">
        {options.map((option) => {
          const active = option.value === selected
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(option.value)}
              className={`flex min-h-12 flex-col items-center justify-center rounded-[var(--r-sm)] border text-sm font-bold transition-colors ${
                active
                  ? 'border-(--c-ocean) bg-(--c-ocean) text-white'
                  : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'
              }`}
            >
              {option.emoji ? (
                <>
                  <span aria-hidden="true" className="text-xl leading-none">
                    {option.emoji}
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
```

- [ ] **Step 2: Verificar**

Run: `pnpm typecheck`
Expected: errores restantes SOLO en `CoachStudents.tsx` y `app/(app)/athlete/progress/page.tsx`.

---

### Task 4: Vistas (CoachStudents + página de progreso del alumno) y commit

**Files:**
- Modify: `components/coach/CoachStudents.tsx` (líneas ~226–228, ~305–316, `EntryItem` ~396–438, eliminar `DetailCol` ~440)
- Modify: `app/(app)/athlete/progress/page.tsx` (líneas ~37–41, ~101–130, eliminar `ProgressNote` ~206–224)

**Interfaces:**
- Consumes: `formatStudentLevel`, `clampScale` de lib; `progressResultEmoji` de `CONSTANTS/PROGRESS_SCALE`.

- [ ] **Step 1: `CoachStudents.tsx` — resumen y métrica del card**

Agregar imports:

```ts
import { progressResultEmoji } from '@/CONSTANTS/PROGRESS_SCALE'
import {
  formatStudentLevel,
  type StudentProgress,
  type StudentProgressEntry,
} from '@/lib/coach-student-progress'
```

Reemplazar líneas ~226–228:

```ts
const level = student.progress ? formatStudentLevel(student.progress) : '1.1'
const summary = `${student.totalClasses} ${student.totalClasses === 1 ? 'clase' : 'clases'} · Nivel ${level}`
```

Reemplazar el segundo `MetricPill` (~311–315):

```tsx
<MetricPill
  icon={<FiTrendingUp aria-hidden="true" />}
  label="Nivel"
  value={student.progress ? formatStudentLevel(student.progress) : '—'}
/>
```

(la variable `assessment` de la línea ~227 queda sin uso — eliminarla.)

- [ ] **Step 2: `CoachStudents.tsx` — `EntryItem` con `3.2 · 😊` y solo nota**

Reemplazar la función `EntryItem` completa (y eliminar `DetailCol`):

```tsx
function EntryItem({ entry }: { entry: StudentProgressEntry }) {
  const [open, setOpen] = useState(false)
  const emoji = progressResultEmoji(entry.result)
  const date = new Date(entry.createdAt).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <li className="rounded-[var(--r-sm)] border border-(--c-border)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start gap-2 p-3 text-left transition-colors hover:bg-(--c-surface)"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-(--c-ocean)">{date}</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--c-surface) px-2.5 py-0.5 text-xs font-semibold text-(--c-ocean)">
              {formatStudentLevel(entry)}
              {emoji && <span aria-hidden="true">· {emoji}</span>}
            </span>
          </div>
          {entry.note && (
            <p
              className={`mt-2 text-sm text-(--c-text-2) ${open ? 'whitespace-pre-wrap' : 'truncate'}`}
            >
              {entry.note}
            </p>
          )}
        </div>
        <FiChevronDown
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-(--c-ocean-mid) transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
    </li>
  )
}
```

- [ ] **Step 3: `app/(app)/athlete/progress/page.tsx` — nivel, promedio /4, sin objetivo/foco**

Imports: quitar `FiTarget` de `react-icons/fi`; agregar:

```ts
import { progressResultEmoji } from '@/CONSTANTS/PROGRESS_SCALE'
import {
  clampScale,
  formatStudentLevel,
  type StudentProgress,
} from '@/lib/coach-student-progress'
```

Reemplazar `avgAssessment` (~37–41):

```ts
const avgAssessment = progress.length
  ? `${Math.round(
      progress.reduce((total, item) => total + clampScale(item.coachAssessment, 1), 0) /
        progress.length
    )}/4`
  : '—'
```

En el card del coach (~101–130): reemplazar `Nivel: {item.level}` por `Nivel {formatStudentLevel(item)}`; reemplazar el span del assessment por:

```tsx
<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-(--c-surface) px-3 py-1 text-sm font-semibold text-(--c-ocean)">
  {progressResultEmoji(item.result) || <FiTrendingUp aria-hidden="true" />}
  {formatStudentLevel(item)}
</span>
```

Eliminar el bloque `{(item.goal || item.nextFocus) && (...)}` completo (~108–125) y la función `ProgressNote` (~206–224). El bloque `{item.lastNote && ...}` se queda.

- [ ] **Step 4: Verificar typecheck y lint completos**

Run: `pnpm typecheck && pnpm check`
Expected: ambos pasan sin errores (biome puede pedir `pnpm format` — correrlo si hace falta).

- [ ] **Step 5: Commit (lib + API + UI juntos — el estado intermedio no compila)**

```bash
git add CONSTANTS/PROGRESS_SCALE.ts lib/coach-student-progress.ts app/api/coach/students/route.ts app/api/coach/agenda/bookings/route.ts components/coach/StudentProgressModal.tsx components/coach/CoachStudents.tsx "app/(app)/athlete/progress/page.tsx"
git commit -m "feat: simplify student progress capture to 3-click scale

Level/sub-level become numeric 1-4 (legacy strings mapped on read),
new result field with emoji scale, goal/nextFocus removed.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Verificación manual del flujo

**Files:** ninguno (verificación).

- [ ] **Step 1: Levantar emulator + dev** según memoria `testing-authed-flows-emulator.md` (login coach vía emulator auth popup).

- [ ] **Step 2: Flujo coach**
  1. Abrir Alumnos → card de un alumno → "Agregar progreso".
  2. Confirmar: 3 filas de pills, nivel/avance pre-seleccionados, resultado sin selección, Guardar deshabilitado.
  3. Elegir resultado → Guardar habilitado → guardar con y sin nota.
  4. Confirmar entry nuevo en historial con formato `3.2 · 😊` y resumen del card `Nivel 3.2`.

- [ ] **Step 3: Legacy** — con un doc que tenga `level: 'Intermedio'` (seed o editar en emulator UI): card muestra `Nivel 3.x`, modal pre-selecciona nivel 3; tras guardar, el doc queda numérico.

- [ ] **Step 4: Flujo alumno** — login como alumno vinculado: "Mi progreso" muestra `Nivel 3.2`, emoji del último resultado, promedio `n/4`, sin bloques Objetivo/Próximo foco. Entries viejos sin `result` no muestran emoji.

- [ ] **Step 5: Reportar resultados** al usuario (qué se verificó, cualquier hallazgo).
