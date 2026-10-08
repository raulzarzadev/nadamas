'use client'

import { useEffect, useRef, useState } from 'react'
import { HiSparkles } from 'react-icons/hi2'
import Sheet from '@/components/ui/sheet'

type Position = { x: number; y: number }
const SIZE = 52
const MARGIN = 12

function clampPosition(position: Position): Position {
  return {
    x: Math.max(MARGIN, Math.min(position.x, window.innerWidth - SIZE - MARGIN)),
    y: Math.max(MARGIN, Math.min(position.y, window.innerHeight - SIZE - MARGIN)),
  }
}

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [dragging, setDragging] = useState(false)
  const pointer = useRef<{ x: number; y: number; origin: Position } | null>(null)
  const moved = useRef(false)

  useEffect(() => {
    const resize = () => setPosition((current) => (current ? clampPosition(current) : null))
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <>
      <button
        type="button"
        aria-label="Abrir asistente de IA"
        aria-haspopup="dialog"
        title="Asistente IA · Puedes arrastrarlo para moverlo"
        className={`fixed z-40 flex size-13 touch-none select-none flex-col items-center justify-center gap-0.5 rounded-full border border-white/70 bg-(--c-ocean) text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--c-aqua-strong) ${dragging ? 'cursor-grabbing' : 'cursor-grab hover:brightness-110'}`}
        style={
          position
            ? { left: position.x, top: position.y }
            : {
                right: 'max(1rem, env(safe-area-inset-right))',
                bottom: 'calc(1rem + env(safe-area-inset-bottom))',
              }
        }
        onPointerDown={(event) => {
          if (event.button !== 0) return
          const rect = event.currentTarget.getBoundingClientRect()
          pointer.current = {
            x: event.clientX,
            y: event.clientY,
            origin: { x: rect.left, y: rect.top },
          }
          moved.current = false
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!pointer.current) return
          const dx = event.clientX - pointer.current.x
          const dy = event.clientY - pointer.current.y
          if (!moved.current && Math.hypot(dx, dy) < 5) return
          moved.current = true
          setDragging(true)
          setPosition(
            clampPosition({ x: pointer.current.origin.x + dx, y: pointer.current.origin.y + dy })
          )
        }}
        onPointerUp={() => {
          pointer.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          pointer.current = null
          moved.current = true
          setDragging(false)
        }}
        onLostPointerCapture={() => {
          pointer.current = null
          setDragging(false)
        }}
        onClick={(event) => {
          if (moved.current && event.detail !== 0) {
            moved.current = false
            return
          }
          setOpen(true)
        }}
        onKeyDown={(event) => {
          const directions: Record<string, Position> = {
            ArrowLeft: { x: -16, y: 0 },
            ArrowRight: { x: 16, y: 0 },
            ArrowUp: { x: 0, y: -16 },
            ArrowDown: { x: 0, y: 16 },
          }
          const direction = directions[event.key]
          if (!direction) return
          event.preventDefault()
          const rect = event.currentTarget.getBoundingClientRect()
          setPosition(clampPosition({ x: rect.left + direction.x, y: rect.top + direction.y }))
        }}
      >
        <HiSparkles aria-hidden="true" size={25} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Asistente IA">
        <div className="grid gap-3 pb-4 text-center">
          <h2 className="text-xl font-bold">Asistente IA</h2>
          <p className="badge badge-soft badge-info justify-self-center text-xs font-bold tracking-wide uppercase">
            Próximamente
          </p>
          <p className="text-sm text-(--c-text-2)">
            Aquí podrás realizar todas las acciones referentes a la gestión de tu empresa desde un
            modo conversación.
          </p>
          <ul className="grid justify-self-center gap-1.5 text-left text-sm text-(--c-text-2)">
            <li>· Consultar horarios</li>
            <li>· Preparar clases</li>
            <li>· Pasar asistencia</li>
            <li>· Asignar profes</li>
          </ul>
        </div>
      </Sheet>
    </>
  )
}
