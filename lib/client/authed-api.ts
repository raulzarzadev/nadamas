import { auth } from '@/firebase/index'

export async function postAuthed(path: string, body?: unknown) {
  const token = await auth.currentUser?.getIdToken()
  return fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  })
}
