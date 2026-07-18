// Single source of truth for coach-agenda hour status colors.
// Canonical palette (see memory `agenda-status-palette`):
//   green hollow/outlined = abierto / disponible (available, empty hour)
//   green filled          = ocupado individual (booked)
//   purple                = clase grupal derivada (2+ students in the same hour)
//   gray                  = bloqueado (blocked)
// Classes are literal so Tailwind can detect them at build time.

export type HourStatus = 'available' | 'blocked' | 'booked' | 'group'

export interface HourStatusStyle {
  /** Thin line in the day-chip occupancy meter. */
  bar: string
  /** Card row border. */
  border: string
  /** Card row background. */
  bg: string
  /** Small status dot. */
  dot: string
}

export const HOUR_STATUS_STYLE: Record<HourStatus, HourStatusStyle> = {
  available: {
    bar: 'border border-emerald-400 bg-transparent',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    dot: 'bg-emerald-400',
  },
  blocked: {
    bar: 'bg-gray-400',
    border: 'border-gray-200',
    bg: 'bg-gray-100/60',
    dot: 'bg-gray-400',
  },
  booked: {
    bar: 'bg-emerald-500',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    dot: 'bg-emerald-500',
  },
  group: {
    bar: 'bg-purple-500',
    border: 'border-purple-200',
    bg: 'bg-purple-50/70',
    dot: 'bg-purple-500',
  },
}
