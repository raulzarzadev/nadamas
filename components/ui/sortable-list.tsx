'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { FiMenu } from 'react-icons/fi'

function SortableItem({
  id,
  label,
  disabled,
  children,
}: {
  id: string
  label: string
  disabled: boolean
  children: (handle: ReactNode) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`min-w-0 rounded-xl ${isDragging ? 'bg-white shadow-lg ring-1 ring-(--c-border)' : ''}`}
    >
      {children(
        <button
          ref={setActivatorNodeRef}
          type="button"
          disabled={disabled}
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${label}`}
          title="Arrastra para reordenar"
          className="grid size-6 shrink-0 touch-none cursor-grab place-items-center rounded text-(--c-text-2) hover:bg-white active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-(--c-ocean)"
        >
          <FiMenu aria-hidden="true" className="size-3" />
        </button>
      )}
    </div>
  )
}

export default function SortableList<T extends { id: string }>({
  items,
  onChange,
  disabled = false,
  label,
  className,
  children,
}: {
  items: T[]
  onChange: (items: T[]) => void
  disabled?: boolean
  label: string
  className?: string
  children: (item: T, index: number, handle: ReactNode) => ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Pulsa espacio para empezar a mover. Usa las flechas para reordenar, espacio para soltar o Escape para cancelar.',
        },
      }}
      onDragEnd={({ active, over }) => {
        if (disabled || !over || active.id === over.id) return
        const from = items.findIndex((item) => item.id === active.id)
        const to = items.findIndex((item) => item.id === over.id)
        if (from >= 0 && to >= 0) onChange(arrayMove(items, from, to))
      }}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              label={`${label} ${index + 1}`}
              disabled={disabled}
            >
              {(handle) => children(item, index, handle)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
