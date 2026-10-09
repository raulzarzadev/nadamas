import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase/index'
import { AuthedRequestCache } from './authed-request-cache'

export class AuthedApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
    this.name = 'AuthedApiError'
  }
}

async function getAuthToken() {
  const currentUser = auth.currentUser
  if (currentUser) {
    const token = await currentUser.getIdToken()
    if (auth.currentUser?.uid !== currentUser.uid) throw new Error('auth_session_changed')
    return token
  }

  const user = await new Promise<NonNullable<typeof auth.currentUser>>((resolve, reject) => {
    let unsubscribe = () => {}
    unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      unsubscribe()
      if (nextUser) resolve(nextUser)
      else reject(new Error('Tu sesión no está disponible. Vuelve a iniciar sesión.'))
    })
  })

  const token = await user.getIdToken()
  if (auth.currentUser?.uid !== user.uid) throw new Error('auth_session_changed')
  return token
}

async function requestAuthed(path: string, init?: RequestInit, providedToken?: string) {
  const token = providedToken || (await getAuthToken())
  const mutates = Boolean(init?.method && init.method !== 'GET')
  if (mutates) invalidateAuthedCache(path)
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
  } finally {
    if (mutates) invalidateAuthedCache(path)
  }

  if (!response.ok) {
    let message = `request_failed:${response.status}`
    let code: string | undefined
    try {
      const payload = (await response.json()) as { error?: unknown; code?: unknown }
      if (typeof payload.error === 'string' && payload.error.trim()) message = payload.error
      if (typeof payload.code === 'string' && /^[a-z_]{1,40}$/.test(payload.code))
        code = payload.code
    } catch {
      // Keep the status-based fallback when the response is not JSON.
    }
    throw new AuthedApiError(message, response.status, code)
  }

  return response
}

const requestCache = new AuthedRequestCache()
let cacheUser: string | null | undefined
onAuthStateChanged(auth, (user) => {
  if (cacheUser !== user?.uid) requestCache.invalidate()
  cacheUser = user?.uid
})

function schoolScope(path: string) {
  const url = new URL(path, 'https://local.invalid')
  return url.pathname.match(/^\/api\/schools\/([^/]+)/)?.[1] || url.searchParams.get('schoolId')
}

export function invalidateAuthedCache(path?: string) {
  if (!path) {
    requestCache.invalidate()
    return
  }
  const scope = schoolScope(path)
  if (path.startsWith('/api/coach/student-tags')) {
    requestCache.invalidate(
      (key) =>
        key.includes('/api/coach/student-tags') &&
        (!scope || schoolScope(key.slice(key.indexOf('|') + 1)) === scope)
    )
  } else if (scope) {
    requestCache.invalidate((key) => {
      const resource = key.slice(key.indexOf('|') + 1)
      return (
        resource === '/api/schools' ||
        resource.startsWith('/api/coach/students') ||
        schoolScope(resource) === scope
      )
    })
  } else requestCache.invalidate()
}

export function getCachedAuthedData<T>(path: string): T | undefined {
  const userId = auth.currentUser?.uid
  if (!userId || cacheUser !== userId) return undefined
  return requestCache.peek(`${userId}|${path}`) as T | undefined
}

export async function getAuthed(path: string) {
  const token = await getAuthToken()
  const userId = auth.currentUser?.uid
  if (cacheUser !== userId) {
    requestCache.invalidate()
    cacheUser = userId
  }
  const pathname = new URL(path, 'https://local.invalid').pathname
  const ttl =
    pathname === '/api/schools'
      ? 60_000
      : /^\/api\/schools\/[^/]+\/(students|classes|teachers|agenda)(?:\/|$)/.test(pathname) ||
          pathname === '/api/coach/student-tags' ||
          pathname === '/api/coach/students'
        ? 15_000
        : 0
  return requestCache.get(`${userId}|${path}`, () => requestAuthed(path, undefined, token), ttl)
}

export function postAuthed(path: string, body?: unknown) {
  return requestAuthed(path, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  })
}

export function putAuthed(path: string, body?: unknown) {
  return requestAuthed(path, {
    method: 'PUT',
    body: JSON.stringify(body || {}),
  })
}

export function patchAuthed(path: string, body?: unknown) {
  return requestAuthed(path, {
    method: 'PATCH',
    body: JSON.stringify(body || {}),
  })
}

export function deleteAuthed(path: string) {
  return requestAuthed(path, { method: 'DELETE' })
}
