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
    throw new Error(`request_failed:${response.status}`)
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

export function patchAuthed(path: string, body?: unknown) {
  return requestAuthed(path, {
    method: 'PATCH',
    body: JSON.stringify(body || {}),
  })
}


export function deleteAuthed(path: string) {
  return requestAuthed(path, { method: 'DELETE' })
}
