import { reportInternalError } from '@/lib/user-facing-error'
import { FirebaseCRUD } from '../FirebaseCRUD'

const crud = new FirebaseCRUD('schoolAgendaUpdates')
type Subscription = { callbacks: Set<() => void>; unsubscribe: () => void }
const subscriptions = new Map<string, Subscription>()
const revisions = new Map<string, string>()

class AgendaUpdates {
  listen(schoolId: string, onChange: () => void) {
    let subscription = subscriptions.get(schoolId)
    if (!subscription) {
      const callbacks = new Set<() => void>()
      let version = revisions.get(schoolId)
      let timer: ReturnType<typeof setTimeout> | undefined
      const unsubscribe = crud.listenDocument(
        schoolId,
        (value, fromCache) => {
          if (fromCache) return
          const next = JSON.stringify([value?.revision || '', value?.lastUpdate || null])
          if (next === version) return
          const initialSnapshot = version === undefined
          version = next
          revisions.set(schoolId, next)
          if (initialSnapshot) return
          clearTimeout(timer)
          timer = setTimeout(() => {
            for (const callback of callbacks) callback()
          }, 200)
        },
        (error) => reportInternalError('AGENDA_UPDATE_LISTENER', error)
      )
      subscription = {
        callbacks,
        unsubscribe: () => {
          clearTimeout(timer)
          unsubscribe()
        },
      }
      subscriptions.set(schoolId, subscription)
    }
    subscription.callbacks.add(onChange)
    return () => {
      subscription.callbacks.delete(onChange)
      if (!subscription.callbacks.size) {
        subscription.unsubscribe()
        subscriptions.delete(schoolId)
      }
    }
  }
}

export const AgendaUpdatesCRUD = new AgendaUpdates()
