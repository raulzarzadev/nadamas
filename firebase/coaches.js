import 'firebase/firestore'
import { db } from './client'
import { normalizeDocs } from './firebase-helpers'

export const getPublicCoachSchedules = async () => {
  const publicCoaches = await db
    .collection('users')
    .where('coach', '==', true)
    .where('publicCoach', '==', true)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
  const schedules = publicCoaches.map(async (coach) => {
    const schedules = await db
      .collection('schedules')
      .where('owner.id', '==', coach.id)
      .get()
      .then(({ docs }) => normalizeDocs(docs))
    return { ...schedules?.[0] || null, ...coach }
  })
  return Promise.all(schedules)
  
  console.log(`schedules`, schedules)

  return
}
