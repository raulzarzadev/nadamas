import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { PaymentSnapshot } from '@/lib/payments/model'

/** Payment writes run through the authorized transactional API, never client Firestore. */
class Payments {
  async get(path: string): Promise<PaymentSnapshot> {
    return (await getAuthed(path)).json()
  }
  async update(path: string, values: object) {
    return (await postAuthed(path, values)).json()
  }
}
export const PaymentCRUD = new Payments()
