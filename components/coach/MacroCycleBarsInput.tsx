'use client'

import { useId, useRef, useState } from 'react'
import { FiChevronDown, FiChevronRight, FiEdit2 } from 'react-icons/fi'
import DateInput from '@/components/ui/date-input'
import Sheet from '@/components/ui/sheet'
import SortableList from '@/components/ui/sortable-list'
import TimelineRangeInput from '@/components/ui/timeline-range-input'
import { nextMesocycleRange, type TrainingCycle } from '@/lib/training-planner'
import CycleDateLabels from './CycleDateLabels'
import CycleDetails from './CycleDetails'

export default function MacroCycleBarsInput({
  macro,
  cycles,
  onChange,
  disabled,
  readOnly = false,
  expanded: sharedExpanded,
  onExpandedChange,
}: {
  macro: TrainingCycle
  cycles: TrainingCycle[]
  onChange: (cycles: TrainingCycle[]) => void
  disabled: boolean
  readOnly?: boolean
  /** Shared open state so nested levels follow the top-level expand-all toggle. */
  expanded?: Record<string, boolean>
  onExpandedChange?: (expanded: Record<string, boolean>) => void
}) {
  const rootRef = useRef<HTMLElement>(null)
  const [snapGuide, setSnapGuide] = useState<{ left: number; top: number; height: number } | null>(
    null
  )
  const [ownExpanded, setOwnExpanded] = useState<Record<string, boolean>>({})
  const expanded = sharedExpanded ?? ownExpanded
  const setExpanded = onExpandedChange ?? setOwnExpanded
  const detailsPrefix = useId()
  const [editingName, setEditingName] = useState<TrainingCycle | null>(null)
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState<TrainingCycle | null>(null)
  const childLabel = macro.type === 'macro' ? 'MESO-ciclo' : 'MICRO-ciclo'
  const childTitle = macro.type === 'macro' ? 'MESO-ciclo' : 'MICRO-ciclo'
  const mesos = cycles.filter((cycle) => cycle.parentId === macro.id)
  const nextRange = nextMesocycleRange(macro, mesos)
  const barOffset = (cycle: TrainingCycle) =>
    Math.max(
      0,
      Math.min(
        100,
        ((Date.parse(cycle.startDate) - Date.parse(macro.startDate)) /
          (Date.parse(macro.endDate) - Date.parse(macro.startDate) + 86400000)) *
          100
      )
    ) || 0
  const barStyle = (cycle: TrainingCycle) => {
    const total = Date.parse(macro.endDate) - Date.parse(macro.startDate) + 86400000
    const width =
      ((Date.parse(cycle.endDate) - Date.parse(cycle.startDate) + 86400000) / total) * 100
    return {
      left: `${barOffset(cycle)}%`,
      width: `${Math.max(0, Math.min(100 - barOffset(cycle), width)) || 0}%`,
    }
  }
  const buttonClass =
    'min-h-11 rounded-full border border-(--c-border) px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
  return (
    <section
      ref={rootRef}
      aria-label={`Barras de ${childLabel}s`}
      className="relative grid min-w-0 gap-3"
    >
      {snapGuide && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-[25] w-px"
          style={{
            left: snapGuide.left,
            top: snapGuide.top,
            height: snapGuide.height,
            backgroundImage:
              'repeating-linear-gradient(to bottom, var(--c-ocean) 0 3px, transparent 3px 6px)',
            opacity: 0.7,
          }}
        />
      )}
      {mesos.length > 0 && macro.startDate && macro.endDate && (
        <SortableList
          items={mesos}
          disabled={disabled || readOnly}
          label={childLabel}
          className="grid gap-1"
          onChange={(ordered) => {
            let index = 0
            onChange(
              cycles.map((cycle) => (cycle.parentId === macro.id ? ordered[index++] : cycle))
            )
          }}
        >
          {(cycle, _index, handle) => (
            <div
              key={cycle.id}
              data-cycle-row={cycle.id}
              className={`relative grid min-w-0 gap-0 ${expanded[cycle.id] ? `rounded-xl ${cycle.type === 'micro' ? 'bg-[#258575]/10' : 'bg-(--c-surface)'}` : ''}`}
            >
              <div
                className={`sticky flex min-h-6 min-w-0 items-center pr-6 [container-type:inline-size] ${cycle.type === 'meso' ? 'z-[24] bg-[#eaf7fb]' : 'z-20 bg-[#d5eeeb]'}`}
                style={{
                  top:
                    cycle.type === 'meso'
                      ? 'var(--app-header-h, 0px)'
                      : 'calc(var(--app-header-h, 0px) + 24px)',
                }}
              >
                {readOnly ? (
                  <span
                    style={{
                      left: `${expanded[cycle.id] && cycle.type !== 'micro' ? 0 : barOffset(cycle)}%`,
                      maxWidth: 'calc(100% - 24px)',
                      transform: `translateX(min(0px, calc(100cqw - ${expanded[cycle.id] && cycle.type !== 'micro' ? 0 : barOffset(cycle)}cqw - 100% - 24px)))`,
                    }}
                    className="absolute truncate text-xs leading-tight font-semibold text-(--c-ocean)"
                  >
                    {cycle.title}
                  </span>
                ) : (
                  handle
                )}
                {!readOnly && (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Editar nombre de ${cycle.title}`}
                    style={{
                      left: `max(24px, ${expanded[cycle.id] && cycle.type !== 'micro' ? 0 : barOffset(cycle)}%)`,
                      maxWidth: 'calc(100% - 48px)',
                      transform: `translateX(min(0px, calc(100cqw - max(24px, ${expanded[cycle.id] && cycle.type !== 'micro' ? 0 : barOffset(cycle)}cqw) - 100% - 24px)))`,
                    }}
                    onClick={() => {
                      setName(cycle.title)
                      setEditingName(cycle)
                    }}
                    className="absolute inline-flex w-max max-w-full items-center gap-1.5 rounded p-0 text-xs leading-tight font-semibold text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                  >
                    <span className="truncate">{cycle.title}</span>
                    <FiEdit2
                      aria-hidden="true"
                      className="size-3 shrink-0 text-(--c-aqua-strong)"
                    />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Detalles de ${cycle.title}`}
                  aria-expanded={Boolean(expanded[cycle.id])}
                  aria-controls={`${detailsPrefix}-${cycle.id}`}
                  onClick={() => setExpanded({ ...expanded, [cycle.id]: !expanded[cycle.id] })}
                  className="absolute right-0 top-0 grid size-6 place-items-center rounded-full text-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                >
                  {expanded[cycle.id] ? (
                    <FiChevronDown aria-hidden="true" />
                  ) : (
                    <FiChevronRight aria-hidden="true" />
                  )}
                </button>
              </div>
              {readOnly ? (
                <div aria-hidden="true" className="relative h-8 w-full min-w-0">
                  <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-(--c-border)" />
                  <div
                    className={`absolute top-0 h-8 rounded-full ${cycle.type === 'micro' ? 'bg-[#258575]' : 'bg-(--c-aqua-strong)'}`}
                    style={barStyle(cycle)}
                  />
                </div>
              ) : (
                <TimelineRangeInput
                  compact
                  thick
                  tone={cycle.type === 'micro' ? 'green' : 'blue'}
                  onSnap={
                    cycle.type === 'meso'
                      ? (snapped) => {
                          const root = rootRef.current
                          if (!snapped || !root) {
                            setSnapGuide(null)
                            return
                          }
                          const target = mesos.find(
                            (item) =>
                              item.id !== cycle.id &&
                              (item.startDate === snapped || item.endDate === snapped)
                          )
                          const trackFor = (id: string) =>
                            Array.from(root.querySelectorAll<HTMLElement>('[data-cycle-row]'))
                              .find((row) => row.dataset.cycleRow === id)
                              ?.querySelector<HTMLElement>(
                                'fieldset[aria-label="Línea de tiempo editable"]'
                              )
                          const sourceRect = trackFor(cycle.id)?.getBoundingClientRect()
                          const targetRect = target && trackFor(target.id)?.getBoundingClientRect()
                          if (!sourceRect || !targetRect) {
                            setSnapGuide(null)
                            return
                          }
                          const bounds = root.getBoundingClientRect()
                          const first = sourceRect.top + sourceRect.height / 2
                          const last = targetRect.top + targetRect.height / 2
                          const fraction =
                            (Date.parse(snapped) - Date.parse(macro.startDate)) /
                            (Date.parse(macro.endDate) - Date.parse(macro.startDate) + 86400000)
                          setSnapGuide({
                            left: sourceRect.left - bounds.left + fraction * sourceRect.width,
                            top: Math.min(first, last) - bounds.top,
                            height: Math.max(1, Math.abs(last - first)),
                          })
                        }
                      : undefined
                  }
                  snapDates={
                    cycle.type === 'meso'
                      ? mesos
                          .filter((item) => item.id !== cycle.id)
                          .flatMap((item) => [item.startDate, item.endDate])
                      : []
                  }
                  min={macro.startDate}
                  max={macro.endDate}
                  value={cycle}
                  label={`Barra ${cycle.title}`}
                  disabled={disabled}
                  onChange={(range) =>
                    onChange(
                      cycles.map((item) => (item.id === cycle.id ? { ...item, ...range } : item))
                    )
                  }
                />
              )}
              <CycleDateLabels
                min={macro.startDate}
                max={macro.endDate}
                startDate={cycle.startDate}
                endDate={cycle.endDate}
                title={cycle.title}
                disabled={disabled}
                onEdit={
                  readOnly
                    ? undefined
                    : () => {
                        setName(cycle.title)
                        setEditingName(cycle)
                      }
                }
              />
              <div id={`${detailsPrefix}-${cycle.id}`} hidden={!expanded[cycle.id]}>
                {expanded[cycle.id] && (
                  <div className="mt-0.5 ml-2 grid min-w-0 gap-2 border-l border-(--c-aqua-strong)/20 pl-2">
                    {cycle.type === 'meso' && (
                      <div aria-hidden="true" className="h-6 w-full rounded-full bg-[#79b9cf]" />
                    )}
                    {cycle.type === 'micro' && (
                      <CycleDetails
                        value={cycle}
                        disabled={disabled}
                        readOnly={readOnly}
                        onChange={(details) =>
                          onChange(
                            cycles.map((item) =>
                              item.id === cycle.id ? { ...item, ...details } : item
                            )
                          )
                        }
                      />
                    )}
                    {cycle.type === 'meso' && (
                      <MacroCycleBarsInput
                        macro={cycle}
                        cycles={cycles}
                        onChange={onChange}
                        disabled={disabled}
                        readOnly={readOnly}
                        expanded={expanded}
                        onExpandedChange={setExpanded}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </SortableList>
      )}
      {readOnly && !mesos.length && macro.startDate && macro.endDate && (
        <p className="text-xs text-(--c-text-2)">{`Todavía no hay ${childLabel}s.`}</p>
      )}
      {!mesos.length && (!macro.startDate || !macro.endDate) && (
        <p className="text-xs text-(--c-text-2)">
          {`Define las fechas del ciclo principal para dibujar sus ${childLabel}s.`}
        </p>
      )}
      {!readOnly && (
        <div className={`flex justify-end ${macro.type === 'meso' ? 'pb-2' : ''}`}>
          <button
            type="button"
            disabled={disabled || !nextRange}
            className="relative inline-flex cursor-pointer items-center rounded-full border border-(--c-aqua-strong)/30 px-2 py-1 text-[10px] font-medium leading-none text-(--c-aqua-strong) before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              if (!nextRange) return
              const cycle: TrainingCycle = {
                id: crypto.randomUUID(),
                parentId: macro.id,
                type: macro.type === 'macro' ? 'meso' : 'micro',
                title: `${childTitle} ${mesos.length + 1}`,
                ...nextRange,
                goal: '',
                content: '',
              }
              onChange([...cycles, cycle])
            }}
          >
            + Agregar {childLabel}
          </button>
        </div>
      )}
      {!readOnly && !nextRange && macro.startDate && macro.endDate && (
        <p className="text-[10px] text-(--c-text-2)">
          No queda espacio después del último {childLabel}. Ajusta sus fechas o amplía el ciclo
          principal.
        </p>
      )}
      <Sheet
        open={Boolean(editingName)}
        onClose={() => setEditingName(null)}
        label="Editar ciclo"
        size="sm"
        keyboardAware
        footer={
          <div className="flex items-center gap-2">
            {cycles.some((cycle) => cycle.id === editingName?.id) && (
              <button
                type="button"
                disabled={disabled}
                aria-label={`Eliminar ${childLabel} ${editingName?.title || ''}`}
                onClick={() => setRemoving(editingName)}
                className="shrink-0 min-h-11 rounded-full px-3 text-xs font-semibold text-(--c-error,#b91c1c) hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-(--c-error,#b91c1c)"
              >
                Eliminar {childLabel}
              </button>
            )}
            <button
              type="button"
              disabled={disabled || !name.trim()}
              className={`${buttonClass} flex-1 bg-(--c-ocean) text-white`}
              onClick={() => {
                if (!editingName) return
                const updated = { ...editingName, title: name.trim() }
                onChange(
                  cycles.some((cycle) => cycle.id === updated.id)
                    ? cycles.map((cycle) => (cycle.id === updated.id ? updated : cycle))
                    : [...cycles, updated]
                )
                setEditingName(null)
              }}
            >
              Listo
            </button>
          </div>
        }
      >
        <h2 className="mb-4 text-lg font-bold">Editar ciclo</h2>
        <label className="grid min-w-0 gap-2 pb-4 text-sm font-semibold">
          Nombre
          <input
            required
            disabled={disabled}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 min-w-0 rounded-xl border border-(--c-border) bg-white px-3 font-normal focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
          />
        </label>
        {editingName && (
          <div className="grid min-w-0 gap-4 pb-4">
            {(['startDate', 'endDate'] as const).map((field) => (
              <DateInput
                key={field}
                label={
                  field === 'startDate' ? 'Fecha de inicio (opcional)' : 'Fecha final (opcional)'
                }
                value={editingName[field]}
                disabled={disabled}
                min={
                  field === 'endDate' ? editingName.startDate || macro.startDate : macro.startDate
                }
                max={field === 'startDate' ? editingName.endDate || macro.endDate : macro.endDate}
                onChange={(date) => setEditingName({ ...editingName, [field]: date })}
              />
            ))}
          </div>
        )}
      </Sheet>
      <Sheet
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        label={`Eliminar ${childLabel}`}
        size="sm"
        footer={
          <button
            type="button"
            disabled={disabled}
            className={`${buttonClass} w-full bg-(--c-ocean) text-white`}
            onClick={() => {
              if (!removing) return
              const removedIds = new Set([removing.id])
              for (const cycle of cycles)
                if (cycle.parentId === removing.id) removedIds.add(cycle.id)
              onChange(cycles.filter((cycle) => !removedIds.has(cycle.id)))
              if (editingName && removedIds.has(editingName.id)) setEditingName(null)
              setRemoving(null)
            }}
          >
            Eliminar {childLabel}
          </button>
        }
      >
        <h2 className="text-lg font-bold">
          ¿Eliminar {childLabel} «{removing?.title}»?
        </h2>
        <p className="mt-3 text-sm text-(--c-text-2)">
          Se quitará este {childLabel}
          {cycles.some((cycle) => cycle.parentId === removing?.id) ? ' y sus MICRO-ciclos' : ''}. El
          cambio se aplicará al guardar el MACRO-ciclo.
        </p>
      </Sheet>
    </section>
  )
}
