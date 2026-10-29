'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  FiActivity,
  FiChevronRight,
  FiEdit2,
  FiInfo,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import PlanSharingControls from '@/components/training/PlanSharingControls'
import DateInput from '@/components/ui/date-input'
import Sheet from '@/components/ui/sheet'
import { useUser } from '@/context/UserContext'
import { TrainingPlanCRUD } from '@/firebase/training-plans/main'
import { TrainingPlanSharing } from '@/firebase/training-plans/sharing'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import { snapCalendarEdge } from '@/lib/timeline-snap'
import { localCalendarDate } from '@/lib/today-training'
import {
  CHILD_CYCLE,
  CYCLE_LABELS,
  type CycleType,
  type TrainingCycle,
  validateTrainingCycle,
} from '@/lib/training-planner'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import MacroCycleBarsInput from './MacroCycleBarsInput'
import MacroCycleCreateSheet from './MacroCycleCreateSheet'
import MacroCyclePeriodInput from './MacroCyclePeriodInput'
import PlanStructureBars from './PlanStructureBars'
import TodayTrainingSummary from './TodayTrainingSummary'
import TrainingCycleTimeline from './TrainingCycleTimeline'
import TrainingPlanOverview from './TrainingPlanOverview'
import { TrainingSaveContext } from './training-save-context'
import { useTrainingPlanAuthor } from './use-training-plan-author'

const actionClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--c-border) bg-white px-4 text-sm font-bold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
const primaryClass = `${actionClass} border-transparent bg-(--c-ocean)! text-white! hover:opacity-90`
const fieldClass =
  'box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 py-2 font-normal text-(--c-ocean) outline-none focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset'
const dateLabel = (value: string) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha'
const contentLabel = (type: CycleType) =>
  type === 'micro' ? 'Sesiones y trabajo de la semana' : 'Contenido y enfoque'
type CycleField = 'title' | 'dates' | 'goal' | 'content'
const FIELD_LABELS: Record<CycleField, string> = {
  title: 'nombre',
  dates: 'fechas',
  goal: 'objetivo',
  content: 'contenido',
}
const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const lastPlanKey = (uid: string) => `nadamas.training.lastPlanId.${uid}`
const readLastPlanId = (uid: string) => {
  try {
    return localStorage.getItem(lastPlanKey(uid))
  } catch {
    return null
  }
}
const writeLastPlanId = (uid: string, planId: string) => {
  try {
    localStorage.setItem(lastPlanKey(uid), planId)
  } catch {
    // Storage can be unavailable (private mode); remembering the plan is only a convenience.
  }
}

// onSearch (athlete Entrenos): the empty state also offers searching public plans;
// onEmptyChange lets the host hide its own search bar while that empty state shows.
export default function TrainingPlanner({
  onSearch,
  onEmptyChange,
  onCreateSession,
}: {
  onSearch?: () => void
  onEmptyChange?: (empty: boolean) => void
  onCreateSession?: () => void
} = {}) {
  const { user } = useUser()
  const author = useTrainingPlanAuthor()
  const uid = user?.uid || user?.id
  const requestedPlanId = useSearchParams().get('plan')
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [subscribed, setSubscribed] = useState<TrainingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [planId, setPlanId] = useState<string | null>(null)
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [creatingMacro, setCreatingMacro] = useState(false)
  const [draft, setDraft] = useState<TrainingCycle | null>(null)
  const [childDrafts, setChildDrafts] = useState<TrainingCycle[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [barsDraft, setBarsDraft] = useState<TrainingCycle[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [editField, setEditField] = useState<CycleField | null>(null)

  const empty = !loading && !loadError && !plans.length && !subscribed.length
  useEffect(() => {
    onEmptyChange?.(empty)
  }, [empty, onEmptyChange])

  // Retry deliberately reloads the same owner-scoped collection.
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision triggers an explicit retry.
  useEffect(() => {
    let active = true
    setLoading(true)
    setPlans([])
    setSubscribed([])
    setPlanId(null)
    setCycleId(null)
    setLoadError(false)
    if (!uid)
      return () => {
        active = false
      }
    // Followed plans are optional: their failure must not blank the user's own plans.
    const loadFollowed = TrainingPlanCRUD.listSubscribed(uid).catch((cause) => {
      reportInternalError('TRAINING_SUBSCRIPTIONS_LOAD', cause)
      return [] as Awaited<ReturnType<typeof TrainingPlanCRUD.listSubscribed>>
    })
    Promise.all([TrainingPlanCRUD.list(uid), loadFollowed])
      .then(([own, followed]) => {
        if (!active) return
        setPlans(own.sort((a, b) => b.createdAt - a.createdAt))
        setSubscribed(followed.sort((a, b) => b.createdAt - a.createdAt))
        // `?plan=` (from a plan preview) preselects that plan's chip; otherwise the last one viewed.
        const preferredId = requestedPlanId || readLastPlanId(uid)
        const requested = [...own, ...followed].find((item) => item.id === preferredId)
        if (requested) {
          setPlanId(requested.id)
          setCycleId(requested.cycles.find((node) => node.type === 'macro')?.id || null)
        }
      })
      .catch((cause) => {
        reportInternalError('TRAINING_PLANS_LOAD', cause)
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [uid, revision, requestedPlanId])

  useEffect(() => {
    if (uid && planId) writeLastPlanId(uid, planId)
  }, [uid, planId])

  const plan =
    plans.find((item) => item.id === planId) || subscribed.find((item) => item.id === planId)
  const owned = plan?.userId === uid
  const cycle =
    plan?.cycles.find((item) => item.id === cycleId) ||
    plan?.cycles.find((item) => item.type === 'macro')
  const parent = plan?.cycles.find((item) => item.id === cycle?.parentId)
  const children = plan?.cycles.filter((item) => item.parentId === cycle?.id) || []
  const planCycles = barsDraft || plan?.cycles || []
  const removedIds = new Set(cycle ? [cycle.id] : [])
  for (const item of planCycles)
    if (item.parentId && removedIds.has(item.parentId)) removedIds.add(item.id)
  const nestedCount = removedIds.size - (cycle ? 1 : 0)
  const nextType = cycle && cycle.type !== 'micro' ? CHILD_CYCLE[cycle.type] : null
  const draftParent = plan?.cycles.find((item) => item.id === draft?.parentId)
  const barsDirty = Boolean(
    barsDraft && plan && JSON.stringify(barsDraft) !== JSON.stringify(plan.cycles)
  )
  const draftHeading = !draft
    ? 'Ciclo'
    : editField
      ? `Editar ${FIELD_LABELS[editField]}`
      : CYCLE_LABELS[draft.type]

  function createMacro() {
    if (busy || !uid) return
    setError('')
    setCreatingMacro(true)
  }

  async function saveNewMacro(cycles: TrainingCycle[]) {
    if (busy || !uid) return
    const macro = cycles[0]
    setBusy(true)
    setError('')
    try {
      const result = await TrainingPlanCRUD.create(cycles, author)
      if (!result?.ok) throw new Error('TRAINING_CREATE_FAILED')
      const created: TrainingPlan = {
        id: result.res.id,
        userId: uid,
        createdAt: Date.now(),
        cycles,
        visibility: 'private',
      }
      setPlans((items) => [created, ...items])
      setPlanId(created.id)
      setCycleId(macro.id)
      setCreatingMacro(false)
      setBarsDraft(cycles)
      setEditing(true)
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_CREATE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  async function unfollow(id: string) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await TrainingPlanSharing.unsubscribe(id)
      setSubscribed((items) => items.filter((item) => item.id !== id))
      setPlanId(null)
      setCycleId(null)
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_UNSUBSCRIBE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  function openFieldEdit(field: CycleField) {
    if (!cycle) return
    setError('')
    setEditField(field)
    setChildDrafts(null)
    setDraft({ ...cycle })
  }

  const editButton = (field: CycleField) =>
    editing && (
      <button
        type="button"
        aria-label={`Editar ${FIELD_LABELS[field]}`}
        onClick={() => openFieldEdit(field)}
        className="grid size-8 shrink-0 place-items-center rounded-full text-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
      >
        <FiEdit2 aria-hidden="true" className="size-3.5" />
      </button>
    )

  function openCreate(type: CycleType) {
    const today = isoDate(new Date())
    setEditField(null)
    setChildDrafts(type === 'macro' ? [] : null)
    setError('')
    setDraft({
      id: crypto.randomUUID(),
      parentId: type === 'macro' ? null : cycle?.id || null,
      ...(cycle?.sessionWeekdays ? { sessionWeekdays: cycle.sessionWeekdays } : {}),
      type,
      title: '',
      startDate: type === 'macro' ? today : cycle?.startDate || '',
      endDate: type === 'macro' ? '' : cycle?.endDate || '',
      goal: '',
      content: '',
    })
  }

  async function save() {
    if (!draft || busy || !uid) return
    const existing = plan?.cycles.some((item) => item.id === draft.id)
    const savedDraft = { ...draft, title: draft.title.trim() }
    const cycles =
      draft.type === 'macro' && childDrafts !== null
        ? [savedDraft, ...childDrafts]
        : existing && plan
          ? planCycles.map((item) => (item.id === draft.id ? savedDraft : item))
          : [...(draft.type === 'macro' ? [] : planCycles), savedDraft]
    const validation = cycles.map((cycle) => validateTrainingCycle(cycle, cycles)).find(Boolean)
    if (validation) {
      setError(validation)
      return
    }
    if (cycles.length > 100) {
      setError('Este MACRO-ciclo ya tiene 100 ciclos. Crea otro MACRO-ciclo para continuar.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result =
        draft.type === 'macro' && !existing
          ? await TrainingPlanCRUD.create(cycles, author)
          : plan
            ? await TrainingPlanCRUD.update(plan.id, cycles, author)
            : undefined
      if (!result?.ok) throw new Error('TRAINING_SAVE_FAILED')
      if (draft.type === 'macro' && !existing) {
        const created: TrainingPlan = {
          id: result.res.id,
          userId: uid,
          createdAt: Date.now(),
          cycles,
        }
        setPlans((items) => [created, ...items])
        setPlanId(created.id)
      } else {
        setPlans((items) =>
          items.map((item) => (item.id === plan?.id ? { ...item, cycles } : item))
        )
        if (barsDraft) setBarsDraft(cycles)
      }
      setCycleId(draft.id)
      setDraft(null)
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_SAVE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  function startEditing() {
    setError('')
    setBarsDraft(plan?.cycles || null)
    setEditing(true)
  }

  function stopEditing() {
    setError('')
    setBarsDraft(null)
    setEditing(false)
  }

  async function finishEditing() {
    if (!plan || !barsDraft || !barsDirty) return stopEditing()
    if (busy) return
    const validation = barsDraft.map((item) => validateTrainingCycle(item, barsDraft)).find(Boolean)
    if (validation || barsDraft.length > 100) {
      setError(validation || 'Este MACRO-ciclo ya tiene 100 ciclos.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await TrainingPlanCRUD.update(plan.id, barsDraft, author)
      if (!result?.ok) throw new Error('TRAINING_BARS_SAVE_FAILED')
      setPlans((items) =>
        items.map((item) => (item.id === plan.id ? { ...item, cycles: barsDraft } : item))
      )
      stopEditing()
    } catch (cause) {
      reportInternalError('TRAINING_BARS_SAVE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const latestPlan = useRef(plan)
  latestPlan.current = plan
  const latestBarsDraft = useRef(barsDraft)
  latestBarsDraft.current = barsDraft
  // Saves pending plan edits but stays in edit mode (used by a day's session sheet).
  async function saveEditsNow() {
    // Refs: the sheet calls this right after onChange, before this closure re-renders.
    const plan = latestPlan.current
    const barsDraft = latestBarsDraft.current
    if (!plan || !barsDraft || JSON.stringify(barsDraft) === JSON.stringify(plan.cycles))
      return true
    if (busy) return false
    const validation = barsDraft.map((item) => validateTrainingCycle(item, barsDraft)).find(Boolean)
    if (validation || barsDraft.length > 100) {
      setError(validation || 'Este MACRO-ciclo ya tiene 100 ciclos.')
      return false
    }
    setBusy(true)
    setError('')
    try {
      const result = await TrainingPlanCRUD.update(plan.id, barsDraft, author)
      if (!result?.ok) throw new Error('TRAINING_SESSION_SAVE_FAILED')
      setPlans((items) =>
        items.map((item) => (item.id === plan.id ? { ...item, cycles: barsDraft } : item))
      )
      return true
    } catch (cause) {
      reportInternalError('TRAINING_SESSION_SAVE', cause)
      setError(GENERIC_USER_ERROR)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!plan || !cycle || busy) return
    setBusy(true)
    setError('')
    try {
      const remaining = planCycles.filter((item) => !removedIds.has(item.id))
      const result = remaining.length
        ? await TrainingPlanCRUD.update(plan.id, remaining, author)
        : await TrainingPlanCRUD.delete(plan.id)
      if (!result?.ok) throw new Error('TRAINING_DELETE_FAILED')
      setPlans((items) =>
        remaining.length
          ? items.map((item) => (item.id === plan.id ? { ...item, cycles: remaining } : item))
          : items.filter((item) => item.id !== plan.id)
      )
      if (!remaining.length) {
        setPlanId(null)
        stopEditing()
      } else if (barsDraft) setBarsDraft(remaining)
      setCycleId(cycle.parentId)
      setDeleting(false)
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_DELETE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="mx-auto max-w-4xl px-1 [--training-toolbar-h:2.25rem] sm:px-0"
      aria-label="Entrenamiento"
    >
      <div
        inert={Boolean(draft) || deleting || infoOpen || creatingMacro}
        aria-hidden={Boolean(draft) || deleting || infoOpen || creatingMacro || undefined}
      >
        {onCreateSession && (
          <div className="flex flex-wrap gap-2 py-4">
            <button
              type="button"
              className={primaryClass}
              disabled={busy || loading}
              onClick={createMacro}
            >
              Crear MACRO-ciclo
            </button>
            <button type="button" className={actionClass} onClick={onCreateSession}>
              Crear sesión suelta
            </button>
          </div>
        )}
        {!loading && !loadError && plans.length + subscribed.length > 0 && (
          <nav aria-label="MACRO-ciclos" className="flex flex-wrap items-center gap-1.5 pt-4 pb-2">
            <button
              type="button"
              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-dashed border-(--c-aqua-strong) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) focus-visible:outline-2 disabled:opacity-50"
              disabled={busy}
              onClick={() => void createMacro()}
            >
              <FiPlus aria-hidden="true" /> MACRO-ciclo
            </button>
            {[...plans, ...subscribed].map((item) => {
              const root = item.cycles.find((node) => node.type === 'macro')
              const followed = item.userId !== uid
              return (
                <button
                  key={item.id}
                  aria-label={followed ? `Suscrito: ${root?.title || 'MACRO-ciclo'}` : undefined}
                  type="button"
                  aria-pressed={planId === item.id}
                  className={
                    planId === item.id
                      ? primaryClass
                      : 'inline-flex min-h-7 items-center justify-center rounded-full border border-(--c-border) bg-white px-2.5 text-[11px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)'
                  }
                  onClick={() => {
                    setPlanId(item.id)
                    stopEditing()
                    setCycleId(root?.id || null)
                  }}
                >
                  {followed ? (
                    <span className="flex flex-col items-center leading-tight">
                      <span>{root?.title || 'MACRO-ciclo'}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {item.summary?.authorName || 'Entrenador'}
                      </span>
                    </span>
                  ) : (
                    root?.title || 'MACRO-ciclo'
                  )}
                </button>
              )
            })}
          </nav>
        )}
        {plans.length + subscribed.length > 0 && (
          <>
            <PlanStructureBars
              plans={plan && !owned ? [plan] : [...plans, ...subscribed]}
              date={localCalendarDate(new Date())}
            />
            <h1 id="training-title" className="pt-4 text-center text-2xl font-extrabold">
              Entreno de hoy
            </h1>
            <TodayTrainingSummary
              plans={plan && !owned ? [plan] : plans}
              loading={loading}
              loadError={loadError}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--c-border) py-4">
              <div>
                <div className="flex items-center gap-1">
                  <h2 className="text-xl font-extrabold">Planeación</h2>
                  <button
                    type="button"
                    aria-label="Información sobre los ciclos"
                    onClick={() => setInfoOpen(true)}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full text-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                  >
                    <FiInfo aria-hidden="true" className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {error && !plan && !draft && !deleting && (
          <p role="alert" className="mb-3 text-sm text-(--c-error,#b91c1c)">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-10 text-center">
            Cargando planificación…
          </p>
        ) : loadError ? (
          <div role="alert" className="space-y-3 py-8">
            <p>{GENERIC_USER_ERROR}</p>
            <button
              type="button"
              className={actionClass}
              onClick={() => setRevision((value) => value + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : empty ? (
          <div className="rounded-2xl border border-dashed border-(--c-border) bg-(--c-surface) px-5 py-10 text-center">
            <FiActivity className="mx-auto mb-4 size-8" aria-hidden="true" />
            {onSearch ? (
              <>
                <h2 className="text-lg font-bold">No tienes entrenos aún</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-(--c-text-2)">
                  Crea uno o busca uno.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    className={primaryClass}
                    disabled={busy}
                    onClick={() => void createMacro()}
                  >
                    Crear entreno
                  </button>
                  <button type="button" className={actionClass} onClick={onSearch}>
                    Buscar entrenos
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold">Tu temporada empieza aquí</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-(--c-text-2)">
                  Comienza creando un MACRO-ciclo. También puedes preparar sesiones individuales;
                  después podrás modificarlas, duplicarlas o usarlas en tus clases.
                </p>
                {onCreateSession && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      className={primaryClass}
                      disabled={busy}
                      onClick={createMacro}
                    >
                      Crear MACRO-ciclo
                    </button>
                    <button type="button" className={actionClass} onClick={onCreateSession}>
                      Crear sesión suelta
                    </button>
                  </div>
                )}
                {!onCreateSession && (
                  <button
                    type="button"
                    className={`${primaryClass} mt-5`}
                    disabled={busy}
                    onClick={() => void createMacro()}
                  >
                    Crear mi primer MACRO-ciclo
                  </button>
                )}
              </>
            )}
          </div>
        ) : !cycle ? (
          <p className="py-8 text-(--c-text-2)">
            Selecciona un MACRO-ciclo para ver su planificación.
          </p>
        ) : (
          <>
            {cycle.parentId && (
              <nav
                aria-label="Ciclos de entrenamiento"
                className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
              >
                {plan?.cycles
                  .filter(
                    (item) =>
                      item.id !== cycle.id && (item.type === 'macro' || item.id === parent?.id)
                  )
                  .map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                      onClick={() => setCycleId(item.id)}
                    >
                      {item.title}
                      <FiChevronRight aria-hidden="true" />
                    </button>
                  ))}
              </nav>
            )}
            <div className="sticky top-[var(--app-header-h,0px)] z-40 grid min-h-9 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 bg-(--c-bg) py-1">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  {editing ? (
                    <input
                      aria-label="Título del ciclo"
                      disabled={busy}
                      maxLength={100}
                      value={planCycles.find((item) => item.id === cycle.id)?.title ?? cycle.title}
                      onChange={(event) =>
                        setBarsDraft(
                          planCycles.map((item) =>
                            item.id === cycle.id ? { ...item, title: event.target.value } : item
                          )
                        )
                      }
                      className="box-border h-7 w-full min-w-0 rounded-lg border border-(--c-border) bg-white px-2 text-xs font-semibold text-(--c-ocean) outline-none hover:border-(--c-border) focus:border-(--c-aqua-strong) focus:bg-white focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
                    />
                  ) : (
                    <h2 className="min-w-0 truncate text-sm font-semibold" title={cycle.title}>
                      {cycle.title}
                    </h2>
                  )}
                </div>
              </div>
              {editing ? (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className={
                      'inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
                    }
                    disabled={busy}
                    onClick={stopEditing}
                  >
                    <FiX aria-hidden="true" />
                    Descartar
                  </button>
                  <button
                    type="button"
                    className={
                      'inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
                    }
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setDeleting(true)
                    }}
                  >
                    <FiTrash2 aria-hidden="true" />
                    Eliminar
                  </button>
                  <button
                    type="button"
                    className={
                      'inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50' +
                      ' border-transparent bg-(--c-ocean)! text-white!'
                    }
                    disabled={busy}
                    onClick={() => void finishEditing()}
                  >
                    <FiSave aria-hidden="true" />
                    {busy ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              ) : owned ? (
                <button
                  type="button"
                  className={
                    'inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
                  }
                  onClick={startEditing}
                >
                  <FiEdit2 aria-hidden="true" />
                  Editar
                </button>
              ) : null}
            </div>
            <div className="mb-3 grid min-w-0 grid-cols-2 gap-1">
              <p className="col-span-2 flex items-center gap-1 text-sm text-(--c-text-2)">
                {dateLabel(cycle.startDate)} — {dateLabel(cycle.endDate)}
                {editButton('dates')}
              </p>
              {cycle.type === 'macro' &&
                (editing ? (
                  <textarea
                    aria-label="Objetivos, comentarios e instrucciones de la temporada"
                    placeholder="Agrega objetivos, comentarios, instrucciones extra, etc."
                    rows={1}
                    maxLength={10000}
                    disabled={busy}
                    value={
                      planCycles.find((item) => item.id === cycle.id)?.content ?? cycle.content
                    }
                    onChange={(event) =>
                      setBarsDraft(
                        planCycles.map((item) =>
                          item.id === cycle.id ? { ...item, content: event.target.value } : item
                        )
                      )
                    }
                    className="[field-sizing:content] col-span-2 box-border min-h-8 w-full min-w-0 max-w-full resize-none rounded-lg border border-(--c-border) bg-white px-2 py-1.5 text-xs leading-relaxed outline-none placeholder:text-(--c-text-2) focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
                  />
                ) : cycle.content.trim() ? (
                  <p className="col-span-2 whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed text-(--c-text-2)">
                    {cycle.content}
                  </p>
                ) : null)}
            </div>
            {owned && plan && cycle.type === 'macro' && (
              <PlanSharingControls
                key={plan.id}
                plan={plan}
                onChange={(next) =>
                  setPlans((items) => items.map((item) => (item.id === next.id ? next : item)))
                }
              />
            )}
            {!owned && plan && cycle.type === 'macro' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void unfollow(plan.id)}
                className="mb-3 inline-flex min-h-11 items-center justify-center rounded-full border border-(--c-border) bg-white px-4 text-xs font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
              >
                Dejar de seguir
              </button>
            )}
            {error && !draft && !deleting && (
              <p role="alert" className="mb-3 text-sm text-(--c-error,#b91c1c)">
                {error}
              </p>
            )}
            <article
              className={
                cycle.type === 'macro'
                  ? 'min-w-0'
                  : 'rounded-2xl border border-(--c-border) bg-white px-2 py-5 sm:p-5'
              }
            >
              {cycle.type === 'macro' && plan && (
                <TrainingSaveContext.Provider value={saveEditsNow}>
                  <TrainingPlanOverview
                    key={plan.id}
                    macros={(owned ? plans : [plan]).flatMap((item) =>
                      item.cycles.filter((node) => node.type === 'macro')
                    )}
                    cycles={editing ? planCycles : plan.cycles}
                    onChange={setBarsDraft}
                    onRequestEdit={owned ? startEditing : undefined}
                    disabled={busy}
                    readOnly={!owned || !editing}
                  />
                </TrainingSaveContext.Provider>
              )}
              {cycle.type !== 'macro' && (
                <>
                  <div className="mt-5 flex items-center gap-1">
                    <h3 className="text-sm font-bold">Objetivo</h3>
                    {editButton('goal')}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {cycle.goal || 'Sin objetivo definido todavía.'}
                  </p>
                  <div className="mt-5 flex items-center gap-1">
                    <h3 className="text-sm font-bold">{contentLabel(cycle.type)}</h3>
                    {editButton('content')}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-(--c-text-2)">
                    {cycle.content || 'Añade el trabajo que quieres desarrollar en este ciclo.'}
                  </p>
                </>
              )}
            </article>
            {cycle.type !== 'macro' && nextType && (
              <section className="mt-6" aria-labelledby="child-cycles-title">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 id="child-cycles-title" className="text-lg font-bold">
                    {nextType === 'meso' ? 'MESO-ciclos' : 'MICRO-ciclos'}
                  </h2>
                  {editing && (
                    <button
                      type="button"
                      className={actionClass}
                      onClick={() => openCreate(nextType)}
                    >
                      <FiPlus aria-hidden="true" />
                      {nextType === 'meso' ? 'Nuevo MESO-ciclo' : 'Nuevo MICRO-ciclo'}
                    </button>
                  )}
                </div>
                {!children.length ? (
                  <p className="rounded-xl border border-dashed border-(--c-border) p-5 text-sm text-(--c-text-2)">
                    Todavía no hay {nextType === 'meso' ? 'MESO-ciclos' : 'MICRO-ciclos'}. Añade el
                    primer bloque de esta planificación.
                  </p>
                ) : (
                  <ul className="divide-y divide-(--c-border) rounded-xl border border-(--c-border) bg-white">
                    {children.map((child) => (
                      <li key={child.id}>
                        <button
                          type="button"
                          className="flex min-h-20 w-full items-center justify-between gap-3 p-4 text-left hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
                          onClick={() => setCycleId(child.id)}
                        >
                          <span className="min-w-0">
                            <span className="block break-words font-bold">{child.title}</span>
                            <span className="mt-1 block text-xs text-(--c-text-2)">
                              {dateLabel(child.startDate)} — {dateLabel(child.endDate)}
                            </span>
                          </span>
                          <FiChevronRight aria-hidden="true" className="shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </div>
      <Sheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        label="Información sobre los ciclos"
        size="sm"
      >
        <h2 className="text-lg font-bold">Planificación del entrenamiento</h2>
        <p className="mt-3 text-sm text-(--c-text-2)">
          MACRO-ciclo: temporada · MESO-ciclo: bloque de trabajo · MICRO-ciclo: semana o periodo
          corto. Tus macrociclos son privados hasta que los hagas públicos.
        </p>
      </Sheet>
      {creatingMacro && (
        <MacroCycleCreateSheet
          number={plans.length + 1}
          busy={busy}
          error={error}
          onClose={() => setCreatingMacro(false)}
          onCreate={saveNewMacro}
        />
      )}
      <Sheet
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        label={draftHeading}
        keyboardAware
        closeDisabled={busy}
        footer={
          <button
            type="submit"
            form="training-cycle-form"
            className={`${primaryClass} w-full`}
            disabled={busy}
          >
            {busy ? 'Guardando…' : editField === 'title' ? 'Guardar nombre' : 'Guardar ciclo'}
          </button>
        }
      >
        {draft && (
          <form
            id="training-cycle-form"
            className="grid min-w-0 grid-cols-1 gap-4 pb-4"
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <h2 className="text-xl font-bold">{draftHeading}</h2>
            {(editField ? editField === 'title' : draft.type !== 'macro') && (
              <label className="grid min-w-0 gap-1 text-sm font-semibold">
                {editField !== 'title' && <span>Nombre</span>}
                <input
                  aria-label="Nombre"
                  required
                  maxLength={100}
                  className={fieldClass}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder={
                    draft.type === 'meso'
                      ? 'Ej. Base aeróbica'
                      : 'Ej. Semana 1 · Técnica y resistencia'
                  }
                />
              </label>
            )}
            {draftParent && (!editField || editField === 'dates') && (
              <TrainingCycleTimeline
                parent={draftParent}
                current={draft}
                siblings={plan?.cycles || []}
                disabled={busy}
                onChange={(range) => setDraft({ ...draft, ...range })}
              />
            )}
            {draft.type === 'macro' && !editField && (
              <div className="grid min-w-0 gap-1">
                <MacroCyclePeriodInput
                  initialEditOpen={
                    !plans.some((item) => item.cycles.some((cycle) => cycle.id === draft.id))
                  }
                  title={draft.title}
                  onTitleChange={(title) =>
                    setDraft((current) => (current ? { ...current, title } : current))
                  }
                  value={draft}
                  onChange={(range) =>
                    setDraft((current) => (current ? { ...current, ...range } : current))
                  }
                  disabled={busy}
                />
                <MacroCycleBarsInput
                  macro={draft}
                  cycles={childDrafts || []}
                  onChange={setChildDrafts}
                  disabled={busy}
                />
              </div>
            )}
            {(editField ? editField === 'dates' : draft.type !== 'macro') && (
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                {(['startDate', 'endDate'] as const).map((field) => (
                  <DateInput
                    key={field}
                    label={
                      field === 'startDate'
                        ? 'Fecha de inicio (opcional)'
                        : 'Fecha final (opcional)'
                    }
                    name={field}
                    disabled={busy}
                    min={draftParent?.startDate || undefined}
                    max={draftParent?.endDate || undefined}
                    value={draft[field]}
                    onChange={(value) =>
                      setDraft({
                        ...draft,
                        ...(draft.type === 'macro'
                          ? snapCalendarEdge(
                              { ...draft, [field]: value },
                              field,
                              plans.flatMap((item) =>
                                item.cycles.filter(
                                  (node) => node.type === 'macro' && node.id !== draft.id
                                )
                              )
                            )
                          : { [field]: value }),
                      })
                    }
                  />
                ))}
              </div>
            )}
            {editField === 'goal' && (
              <label className="grid min-w-0 gap-1 text-sm font-semibold">
                Objetivo
                <textarea
                  className={`${fieldClass} [field-sizing:content] min-h-28`}
                  maxLength={2000}
                  value={draft.goal}
                  onChange={(event) => setDraft({ ...draft, goal: event.target.value })}
                  placeholder="Ej. Mejorar la resistencia aeróbica"
                />
              </label>
            )}
            {(editField ? editField === 'content' : draft.type === 'micro') && (
              <label className="grid min-w-0 gap-1 text-sm font-semibold">
                <span>
                  {contentLabel(draft.type)}{' '}
                  <span className="text-[10px] font-normal text-(--c-text-2)">(opcional)</span>
                </span>
                <textarea
                  className={`${fieldClass} [field-sizing:content] min-h-11`}
                  maxLength={10000}
                  value={draft.content}
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  placeholder="Lunes: calentamiento, técnica, serie principal y vuelta a la calma. Incluye distancias, intensidad y descansos."
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
                {error}
              </p>
            )}
          </form>
        )}
      </Sheet>
      <Sheet
        open={deleting}
        onClose={() => setDeleting(false)}
        label="Eliminar ciclo"
        closeDisabled={busy}
        footer={
          <button
            type="button"
            className={`${primaryClass} w-full`}
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? 'Eliminando…' : 'Eliminar ciclo'}
          </button>
        }
      >
        <h2 className="text-xl font-bold">¿Eliminar {cycle?.title}?</h2>
        <p className="mt-3 text-sm">
          {cycle?.type === 'macro'
            ? 'Se eliminará toda la temporada'
            : 'Se eliminará este ciclo de tu planificación'}
          {nestedCount > 0
            ? nestedCount === 1
              ? ', incluido 1 ciclo que contiene'
              : `, incluidos ${nestedCount} ciclos que contiene`
            : ''}
          . Esta acción no se puede deshacer.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-(--c-error,#b91c1c)">
            {error}
          </p>
        )}
      </Sheet>
    </section>
  )
}
