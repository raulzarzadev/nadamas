// Paths a login link may return to besides the default landing page.
const PROFILE_INVITATION = /^\/athlete\/profile-invitations\/(?:[A-Za-z0-9_-]{43}|[a-f0-9]{64})$/
const TRAINING_PLAN = /^\/athlete\/training\/plans\/[\w-]{1,128}(?:\?invite=[\w-]{43})?$/

export function isAllowedPostLoginPath(path: unknown): path is string {
  return typeof path === 'string' && (PROFILE_INVITATION.test(path) || TRAINING_PLAN.test(path))
}
