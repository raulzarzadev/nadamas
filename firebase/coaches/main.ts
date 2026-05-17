import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { Dates } from 'firebase-dates-util'
import { db } from '@/firebase/index'
import { FirebaseCRUD } from '@/firebase/FirebaseCRUD'
import type {
  CoachPublic,
  CoachPrivate,
  CoachIdentityVerification,
} from './coach.model'
import type {
  UpsertCoachPublicDto,
  UpsertCoachPrivateDto,
} from './coach.dtos'

const publicRef = (uid: string) => doc(db, 'coaches', uid)
const privateRef = (uid: string) => doc(db, 'coaches', uid, 'private', 'profile')

export class Coach {
  listenPublic(uid: string, cb: (doc: CoachPublic | null) => void) {
    return onSnapshot(publicRef(uid), (snap) =>
      cb(FirebaseCRUD.normalizeDoc(snap) as CoachPublic | null)
    )
  }

  async getPublic(uid: string): Promise<CoachPublic | null> {
    const snap = await getDoc(publicRef(uid))
    return FirebaseCRUD.normalizeDoc(snap) as CoachPublic | null
  }

  async upsertPublic(uid: string, partial: UpsertCoachPublicDto) {
    const snap = await getDoc(publicRef(uid))
    const base: Record<string, unknown> = {
      ...partial,
      userId: uid,
      updatedAt: new Date(),
    }
    if (!snap.exists()) base.createdAt = new Date()
    const payload = Dates.deepFormatObjectDates(base, 'number')
    return setDoc(publicRef(uid), payload, { merge: true })
  }

  listenPrivate(uid: string, cb: (doc: CoachPrivate | null) => void) {
    return onSnapshot(privateRef(uid), (snap) =>
      cb(FirebaseCRUD.normalizeDoc(snap) as CoachPrivate | null)
    )
  }

  listenPendingIdentityReviews(
    cb: (docs: Array<CoachPrivate & { coachId: string }>) => void
  ) {
    const privateDocs = new Map<string, CoachPrivate | null>()
    const privateUnsubs = new Map<string, () => void>()

    function emitPending() {
      cb(
        [...privateDocs.entries()]
          .filter(
            (
              entry
            ): entry is [string, CoachPrivate] =>
              entry[1]?.identityVerification?.status === 'pending'
          )
          .map(([coachId, doc]) => ({ ...doc, coachId }))
      )
    }

    const coachesUnsub = onSnapshot(collection(db, 'coaches'), (snapshot) => {
      const coachIds = new Set(snapshot.docs.map((snap) => snap.id))

      for (const coachId of coachIds) {
        if (privateUnsubs.has(coachId)) continue
        const unsub = this.listenPrivate(coachId, (doc) => {
          privateDocs.set(coachId, doc)
          emitPending()
        })
        privateUnsubs.set(coachId, unsub)
      }

      for (const [coachId, unsub] of privateUnsubs) {
        if (coachIds.has(coachId)) continue
        unsub()
        privateUnsubs.delete(coachId)
        privateDocs.delete(coachId)
      }

      emitPending()
    })

    return () => {
      coachesUnsub()
      privateUnsubs.forEach((unsub) => unsub())
    }
  }

  async upsertPrivate(uid: string, partial: UpsertCoachPrivateDto) {
    const payload = Dates.deepFormatObjectDates(
      { ...partial, updatedAt: new Date() },
      'number'
    )
    return setDoc(privateRef(uid), payload, { merge: true })
  }

  async reviewIdentity(
    uid: string,
    review: Pick<
      CoachIdentityVerification,
      'status' | 'reviewedAt' | 'reviewedBy' | 'adminNote'
    >
  ) {
    const current = await getDoc(privateRef(uid))
    const currentProfile = FirebaseCRUD.normalizeDoc(current) as CoachPrivate | null

    return this.upsertPrivate(uid, {
      identityVerification: {
        ...(currentProfile?.identityVerification || {
          status: 'not_submitted' as const,
        }),
        ...review,
      },
    })
  }

  /**
   * Upload a coach asset. scope decides the storage path prefix so
   * Storage rules can lock down private assets separately.
   */
  uploadAsset(
    {
      file,
      uid,
      scope,
    }: { file: Blob; uid: string; scope: 'public' | 'private' },
    cb: (progress?: number, downloadURL?: string | null) => void
  ) {
    const fieldName =
      scope === 'public' ? `coach-public/${uid}` : `coach-private/${uid}`
    return FirebaseCRUD.uploadFile({ file, fieldName }, cb)
  }
}

export const CoachCRUD = new Coach()
