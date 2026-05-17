import { collection, doc, onSnapshot, query, updateDoc } from 'firebase/firestore'
import { Dates } from 'firebase-dates-util'
import { db } from '@/firebase/index'
import { FirebaseCRUD } from '@/firebase/FirebaseCRUD'
import type { Roles } from '@/lib/roles'
import type { AppUser } from './user.model'

export class Users {
  listenAll(cb: (users: AppUser[]) => void) {
    const q = query(collection(db, 'users'))

    return onSnapshot(q, (snapshot) => {
      cb(
        snapshot.docs
          .map((snap) => FirebaseCRUD.normalizeDoc(snap) as AppUser)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      )
    })
  }

  async updateRoles(uid: string, roles: Roles) {
    const payload = Dates.deepFormatObjectDates(
      { roles, updatedAt: new Date() },
      'number'
    )

    return updateDoc(doc(db, 'users', uid), payload)
  }
}

export const UserCRUD = new Users()
