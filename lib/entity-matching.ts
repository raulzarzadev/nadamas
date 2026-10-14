/** Normalize names for matching without accents, case or repeated whitespace. */
export function normalizeEntitySearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function entityNameMatches(name: string, query: string): boolean {
  const normalized = normalizeEntitySearch(query)
  return (
    normalized.length >= 2 &&
    normalized.split(' ').every((part) => normalizeEntitySearch(name).includes(part))
  )
}
