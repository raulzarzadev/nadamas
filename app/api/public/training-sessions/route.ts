import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { adminDb } from '@/lib/server/firebase-admin'

export async function GET(request: Request) {
  try {
    const session = new URL(request.url).searchParams.get('session')
    if (session !== null) {
      if (!/^[\w-]{1,128}$/.test(session))
        return NextResponse.json({ error: 'No encontramos esta sesión.' }, { status: 404 })
      const shared = session.length === 43
      const coach = session.startsWith('coach-') && !shared
      const id = shared
        ? createHash('sha256').update(session).digest('hex')
        : coach
          ? session.slice(6)
          : session
      const data = (
        await adminDb
          .collection(
            shared
              ? 'sharedTrainingSessions'
              : coach
                ? 'coachStandaloneSessions'
                : 'athleteTrainingSessions'
          )
          .doc(id)
          .get()
      ).data()
      if (!data || (!shared && coach && data.visibility === 'private'))
        return NextResponse.json({ error: 'No encontramos esta sesión.' }, { status: 404 })
      return NextResponse.json(
        {
          item: {
            id: session,
            title: typeof data.title === 'string' ? data.title : 'Entreno',
            description: typeof data.description === 'string' ? data.description : '',
            authorId: '',
            authorName:
              typeof data.authorName === 'string' ? data.authorName : 'Entreno compartido',
            training: normalizeClassTraining(data.training || []) || [],
            updatedAt: 0,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }
    const [snapshot, coachSnapshot] = await Promise.all([
      adminDb.collection('athleteTrainingSessions').orderBy('updatedAt', 'desc').limit(50).get(),
      adminDb.collection('coachStandaloneSessions').orderBy('updatedAt', 'desc').limit(50).get(),
    ])
    const coachIds = [
      ...new Set(
        coachSnapshot.docs
          .map((doc) => doc.data().coachId)
          .filter((id): id is string => typeof id === 'string' && /^[\w-]{1,128}$/.test(id))
      ),
    ]
    const authors = coachIds.length
      ? await adminDb.getAll(...coachIds.map((id) => adminDb.collection('users').doc(id)))
      : []
    const authorNames = new Map(authors.map((doc) => [doc.id, doc.data()]))
    const items = snapshot.docs.map((doc) => {
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
    const coachItems = coachSnapshot.docs.flatMap((doc) => {
      const data = doc.data()
      if (data.visibility === 'private' || typeof data.coachId !== 'string') return []
      const author = authorNames.get(data.coachId)
      return [
        {
          id: `coach-${doc.id}`,
          authorId: data.coachId,
          title: typeof data.title === 'string' ? data.title : 'Entreno',
          description: typeof data.description === 'string' ? data.description : '',
          training: normalizeClassTraining(data.training || []) || [],
          authorName:
            typeof author?.displayName === 'string'
              ? author.displayName
              : typeof author?.name === 'string'
                ? author.name
                : 'Entrenador',
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
        },
      ]
    })
    items.push(...coachItems)
    items.sort((a, b) => b.updatedAt - a.updatedAt)
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (cause) {
    reportServerError('PUBLIC_TRAINING_SESSIONS_LOAD', cause, request)
    return NextResponse.json({ error: 'No pudimos cargar los entrenos.' }, { status: 500 })
  }
}
