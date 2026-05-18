/**
 * Public-facing display name. The user-set `nickname` is the visible
 * identity; legal `firstName`/`lastName` are kept private (INE cotejo) and
 * never used for display. Falls back through legacy fields, then email.
 */
export function publicNameFromUser(user?: Record<string, unknown> | null): string {
  const candidates = [user?.nickname, user?.displayName, user?.name]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  const email = typeof user?.email === 'string' ? user.email : ''
  if (email) return email.split('@')[0]

  return 'Coach de natación'
}
