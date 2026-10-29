export const APP_ORIGIN = 'https://app.nadamas.app'

/** Development login stays on the current localhost host and port. */
export function appLoginHref(environment = process.env.NODE_ENV) {
  return environment === 'development' ? '/login' : `${APP_ORIGIN}/login`
}

const APP_ROOTS = new Set([
  'login',
  'logout',
  'profile',
  'notifications',
  'dashboard',
  'welcome',
  'interfaces',
  'auth',
  'athlete',
  'admin',
])
const SCHOOL_ROUTES = new Set([
  'create',
  'invitations',
  'students',
  'coaches',
  'classes',
  'payments',
  'settings',
  'subscription',
])
const COACH_ROUTES = new Set([
  'training',
  'home',
  'payments',
  'invitations',
  'students',
  'activate',
  'coach-profile',
  'agenda',
  'classes',
])

export function isProductPath(pathname: string) {
  const [root, child] = pathname.split('/').filter(Boolean)
  if (APP_ROOTS.has(root)) return true
  if (root === 'school') return !child || SCHOOL_ROUTES.has(child)
  if (root === 'coach') return !child || COACH_ROUTES.has(child)
  return false
}
