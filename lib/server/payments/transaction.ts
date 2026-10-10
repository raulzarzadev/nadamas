import 'server-only'
import type { Transaction } from 'firebase-admin/firestore'
import { adminDb } from '../firebase-admin'

/** The emulator can report a lock retry as INVALID_ARGUMENT instead of ABORTED.
 * Retry only that specific closed-transaction error; writes remain atomic and
 * all callbacks must be idempotent. Other validation/provider errors propagate.
 */
export async function runPaymentTransaction<T>(
  callback: (transaction: Transaction) => Promise<T>
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await adminDb.runTransaction(callback)
    } catch (error) {
      const closed =
        error instanceof Error &&
        'code' in error &&
        error.code === 3 &&
        /Transaction is invalid or closed/.test(error.message)
      if (!closed || attempt >= 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
    }
  }
}
