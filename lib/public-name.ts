/**
 * Public-facing display name. The user-set `nickname` is the visible
 * identity; legal `firstName`/`lastName` are kept private (INE cotejo) and
 * never used for display. Falls back through legacy fields, then `fallback`.
 * Never derives a name from the email: it would expose it publicly.
 */
export function publicNameFromUser(
  user?: Record<string, unknown> | null,
  fallback = 'Coach de natación'
): string {
  const candidates = [user?.nickname, user?.displayName, user?.name]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return fallback
}
