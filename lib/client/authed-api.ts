import { auth } from '@/firebase/index'

async function requestAuthed(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken()
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
