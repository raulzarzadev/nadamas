// Single source of truth for coach-agenda hour status colors.
// Canonical palette (see memory `agenda-status-palette`):
//   green  = abierto / disponible (available)
//   blue   = bloqueado (blocked)
//   purple = ocupado / lleno (booked / full)
// Classes are literal so Tailwind can detect them at build time.

export type HourStatus = 'available' | 'blocked' | 'booked'

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
    bar: 'bg-emerald-400',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    dot: 'bg-emerald-400',
  },
  blocked: {
    bar: 'bg-blue-500',
    border: 'border-blue-100',
    bg: 'bg-blue-50/60',
    dot: 'bg-blue-500',
  },
  booked: {
    bar: 'bg-red-500',
    border: 'border-red-200',
    bg: 'bg-red-50/60',
    dot: 'bg-red-500',
  },
}
