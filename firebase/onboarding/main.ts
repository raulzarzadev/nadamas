import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { OnboardingInput, OnboardingSnapshot } from '@/lib/onboarding/model'

class Onboarding {
  async get(): Promise<OnboardingSnapshot> {
    return (await getAuthed('/api/onboarding', 15000)).json()
  }
  async save(input: OnboardingInput): Promise<OnboardingSnapshot> {
    return (await postAuthed('/api/onboarding', input, 15000)).json()
  }
}
export const OnboardingCRUD = new Onboarding()
