import type { CoachPublic } from '@/firebase/coaches/coach.model'

const CACHE_PREFIX = 'nadamas:coach-profile:'

export interface CachedCoachProfile {
  coach: CoachPublic & { id: string }
  name: string
  cachedAt: number
}

export function cacheCoachProfile(coach: CoachPublic & { id: string; name: string }) {
  if (typeof window === 'undefined') return

  const payload: CachedCoachProfile = {
    coach,
    name: coach.name,
    cachedAt: Date.now(),
  }

  sessionStorage.setItem(`${CACHE_PREFIX}${coach.id}`, JSON.stringify(payload))
}

export function readCachedCoachProfile(id: string): CachedCoachProfile | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${id}`)
    return raw ? (JSON.parse(raw) as CachedCoachProfile) : null
  } catch {
    return null
  }
}
