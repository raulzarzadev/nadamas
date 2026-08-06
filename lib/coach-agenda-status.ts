// Single source of truth for coach-agenda hour status colors.
// Canonical palette (see memory `agenda-status-palette`):
//   green hollow/outlined = abierto / disponible (available, empty hour)
//   green filled          = ocupado individual (booked)
//   purple                = clase grupal derivada (2+ students in the same hour)
//   gray                  = bloqueado (blocked)
// Classes are literal so Tailwind can detect them at build time.

export type HourStatus = 'available' | 'blocked' | 'booked' | 'groupAvailable' | 'group'

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
    // Hollow everywhere: an available hour is an empty (outlined) container.
    bar: 'border border-emerald-500 bg-transparent',
    border: 'border-emerald-400',
    bg: 'bg-white',
    dot: 'border-2 border-emerald-500 bg-transparent',
  },
  blocked: {
    bar: 'bg-gray-500',
    border: 'border-gray-300',
    bg: 'bg-gray-200/70',
    dot: 'bg-gray-500',
  },
  booked: {
    bar: 'bg-emerald-600',
    border: 'border-emerald-300',
    bg: 'bg-emerald-100/70',
    dot: 'bg-emerald-600',
  },
  groupAvailable: {
    bar: 'border border-purple-600 bg-transparent',
    border: 'border-purple-300',
    bg: 'bg-transparent',
    dot: 'border-2 border-purple-600 bg-transparent',
  },
  group: {
    bar: 'bg-purple-600',
    border: 'border-purple-300',
    bg: 'bg-purple-100/70',
    dot: 'bg-purple-600',
  },
}
