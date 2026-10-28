import { SCHOOL_PALETTES, type School } from '@/lib/school'

export interface ThemePalette {
  primary: string
  secondary: string
  accent: string
  surface: string
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value)
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return `#${[r, g, b]
    .map((v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Builds an accessible palette (white text on primary >= 4.5:1) from one brand color. */
export function paletteFromHex(hex: string): ThemePalette {
  const [h, s, l] = hexToHsl(hex.toLowerCase())
  const surface = hslToHex(h, Math.min(s, 0.6), 0.97)
  let pl = Math.min(l, 0.45)
  let primary = hslToHex(h, s, pl)
  while (
    (contrastRatio('#ffffff', primary) < 4.5 || contrastRatio(primary, surface) < 4.5) &&
    pl > 0
  ) {
    pl = Math.max(0, pl - 0.01)
    primary = hslToHex(h, s, pl)
  }
  return {
    primary,
    secondary: hslToHex(h, s, 0.5),
    accent: hslToHex(h, s, 0.85),
    surface,
  }
}

export function resolveSchoolPalette(
  school: Pick<School, 'palette' | 'customColor'>
): ThemePalette {
  if (isHexColor(school.customColor)) return paletteFromHex(school.customColor)
  const preset = SCHOOL_PALETTES.find((item) => item.value === school.palette) || SCHOOL_PALETTES[0]
  return {
    primary: preset.primary,
    secondary: preset.secondary,
    accent: preset.accent,
    surface: preset.surface,
  }
}

/** CSS custom properties consumed by `--school-*` utilities. */
export function schoolThemeVars(palette: ThemePalette): Record<string, string> {
  return {
    '--school-primary': palette.primary,
    '--school-secondary': palette.secondary,
    '--school-accent': palette.accent,
    '--school-surface': palette.surface,
  }
}
