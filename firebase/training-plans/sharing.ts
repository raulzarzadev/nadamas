import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { PlanPreview } from '@/lib/server/training-plan-sharing'

export type { PlanPreview }
export type PlanSubscriber = { uid: string; name: string; photo: string; createdAt: number }

const base = (id: string) => `/api/training-plans/${encodeURIComponent(id)}`

export const TrainingPlanSharing = {
  async preview(id: string, invite?: string): Promise<PlanPreview> {
    const query = invite ? `?invite=${encodeURIComponent(invite)}` : ''
    return (await getAuthed(`${base(id)}/preview${query}`)).json()
  },
  async subscribe(id: string, invite?: string): Promise<void> {
    await postAuthed(`${base(id)}/subscription`, invite ? { invite } : {})
  },
  async unsubscribe(id: string): Promise<void> {
    await deleteAuthed(`${base(id)}/subscription`)
  },
  async createInvite(id: string, regenerate = false): Promise<string> {
    const { token } = (await (
      await postAuthed(`${base(id)}/invite`, regenerate ? { regenerate: true } : {})
    ).json()) as { token: string }
    return token
  },
  async subscribers(id: string): Promise<PlanSubscriber[]> {
    const { subscribers } = (await (await getAuthed(`${base(id)}/subscribers`)).json()) as {
      subscribers: PlanSubscriber[]
    }
    return subscribers
  },
  async removeSubscriber(id: string, uid: string): Promise<void> {
    await deleteAuthed(`${base(id)}/subscribers/${encodeURIComponent(uid)}`)
  },
}
