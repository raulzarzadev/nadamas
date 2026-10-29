export type ProfileInterest = 'swimmer' | 'coach' | 'coordinator'
export type CoachContext = 'independent' | 'school' | 'both'
export interface OnboardingPreferences {
  version: 1
  interests: ProfileInterest[]
  coachContext: CoachContext | null
  completedAt: number
}
export interface OnboardingSnapshot {
  onboarding: OnboardingPreferences | null
}
export interface OnboardingInput {
  interests: ProfileInterest[]
  coachContext: CoachContext | null
}
export function needsOnboarding(
  user:
    | { roles?: { admin?: boolean }; onboarding?: { version?: number; completedAt?: number } }
    | null
    | undefined
) {
  return Boolean(
    user && !user.roles?.admin && !(user.onboarding?.version === 1 && user.onboarding.completedAt)
  )
}
export function validateOnboarding(value: unknown): OnboardingInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  if (
    !Array.isArray(input.interests) ||
    !input.interests.length ||
    input.interests.length > 3 ||
    input.interests.some((item) => !['swimmer', 'coach', 'coordinator'].includes(item))
  )
    return null
  const interests = [...new Set(input.interests)] as ProfileInterest[]
  if (
    interests.includes('coach') &&
    !['independent', 'school', 'both'].includes(String(input.coachContext))
  )
    return null
  return {
    interests,
    coachContext: interests.includes('coach') ? (input.coachContext as CoachContext) : null,
  }
}
