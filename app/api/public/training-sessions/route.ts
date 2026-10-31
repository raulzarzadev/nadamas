import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { adminDb } from '@/lib/server/firebase-admin'

export async function GET(request: Request) {
  try {
    const snapshot = await adminDb
      .collection('athleteTrainingSessions')
      .where('visibility', '==', 'public')
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get()
    const items = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          authorId: typeof data.athleteId === 'string' ? data.athleteId : '',
          title: typeof data.title === 'string' ? data.title : 'Entreno',
          description: typeof data.description === 'string' ? data.description : '',
          training: normalizeClassTraining(data.training || []) || [],
          authorName: typeof data.authorName === 'string' ? data.authorName : 'Atleta',
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
        }
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    reportServerError('PUBLIC_TRAINING_SESSIONS_LOAD', cause, request)
    return NextResponse.json({ error: 'No pudimos cargar los entrenos.' }, { status: 500 })
  }
}
