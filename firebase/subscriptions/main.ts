import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { SubscriptionAdminSnapshot, SubscriptionSnapshot } from '@/lib/subscriptions/model'

async function read<T>(response: Response): Promise<T> {
  const result = await response.json()
  if (!response.ok)
    throw new Error(
      typeof result.error === 'string'
        ? result.error
        : 'No pudimos guardar el cambio. Inténtalo de nuevo.'
    )
  return result as T
}
class Subscriptions {
  /** `usage` asks for the plan's seat usage (managers only; counting seats is costly). */
  async get(schoolId: string, { usage = false }: { usage?: boolean } = {}) {
    return read<SubscriptionSnapshot>(
      await getAuthed(
        `/api/subscriptions?schoolId=${encodeURIComponent(schoolId)}${usage ? '&usage=1' : ''}`
      )
    )
  }
  async update(schoolId: string, values: object) {
    return read<{ ok?: boolean; order?: unknown }>(
      await postAuthed('/api/subscriptions', { ...values, schoolId })
    )
  }
  async getAdmin() {
    return read<SubscriptionAdminSnapshot>(await getAuthed('/api/subscriptions/admin'))
  }
  async updateAdmin(values: object) {
    return read<{ ok: boolean; code?: string }>(
      await postAuthed('/api/subscriptions/admin', values)
    )
  }
  async card(schoolId: string, values: { action?: string } = {}) {
    const action = values.action || 'checkout'
    return read<{ url?: string; ok?: boolean }>(
      await postAuthed('/api/subscriptions/card', { schoolId, action })
    )
  }
}
export const SubscriptionCRUD = new Subscriptions()
