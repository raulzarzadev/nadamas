export type SlugKind = 'coach' | 'athlete'

// Slugs share the root namespace with real routes, so these first-path segments
// are off-limits. Keep in sync with app/(marketing) segments + app/(app) firsts.
export const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'atleta',
  'athlete',
  'athletes',
  'auth-gate',
  'coach',
  'coaches',
  'como-verificamos',
  'contacto',
  'dashboard',
  'login',
  'logout',
  'nadador',
  'notifications',
  'privacidad',
  'profile',
  'terminos',
])

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/

/** Turn a display name into a candidate slug (lowercase kebab, ascii-folded). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug)
}

/** Normalize user input before validation/lookup. */
export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase()
}
