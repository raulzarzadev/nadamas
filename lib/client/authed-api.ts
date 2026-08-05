import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase/index'

async function getAuthToken() {
  const currentUser = auth.currentUser
  if (currentUser) return currentUser.getIdToken()

  const user = await new Promise<NonNullable<typeof auth.currentUser>>((resolve, reject) => {
    let unsubscribe = () => {}
    unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      unsubscribe()
      if (nextUser) resolve(nextUser)
      else reject(new Error('Tu sesión no está disponible. Vuelve a iniciar sesión.'))
    })
  })

  return user.getIdToken()
}

async function requestAuthed(path: string, init?: RequestInit) {
  const token = await getAuthToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `request_failed:${response.status}`
    try {
      const payload = (await response.json()) as { error?: unknown }
      if (typeof payload.error === 'string' && payload.error.trim()) message = payload.error
    } catch {
      // Keep the status-based fallback when the response is not JSON.
    }
    throw new Error(message)
  }

  return response
}

export function getAuthed(path: string) {
  return requestAuthed(path)
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
