// Paths a login link may return to besides the default landing page.
const PROFILE_INVITATION = /^\/athlete\/profile-invitations\/(?:[A-Za-z0-9_-]{43}|[a-f0-9]{64})$/
const TRAINING_PLAN = /^\/athlete\/training\/plans\/[\w-]{1,128}(?:\?invite=[\w-]{43})?$/

/** Same-origin absolute paths only; anything else (protocol-relative, backslashes, control chars) falls back. */
export function safeRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback
  return value
}

export function isAllowedPostLoginPath(path: unknown): path is string {
  return typeof path === 'string' && (PROFILE_INVITATION.test(path) || TRAINING_PLAN.test(path))
}
