import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

async function getAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return null
  const caller = await adminAuth.verifyIdToken(token)
  const callerDoc = await adminDb.collection('users').doc(caller.uid).get()
  return callerDoc.data()?.roles?.admin === true ? caller : null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const { id } = await params
  const [authUser, userDoc, coachDoc, privateCoachDoc, bookings] = await Promise.all([
    adminAuth.getUser(id).catch(() => null),
    adminDb.collection('users').doc(id).get(),
    adminDb.collection('coaches').doc(id).get(),
    adminDb.collection('coaches').doc(id).collection('private').doc('profile').get(),
    adminDb.collection('bookings').where('athleteId', '==', id).get(),
  ])

  const coachIds = [...new Set(bookings.docs.map((doc) => doc.data().coachId).filter(Boolean))]
  const coachUsers = await Promise.all(
    coachIds.map(async (coachId) => {
      const snap = await adminDb.collection('users').doc(coachId).get()
      const data = snap.data()
      return {
        id: coachId,
        name: data?.displayName || data?.name || data?.email || coachId,
      }
    })
  )

  return NextResponse.json({
    user: userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null,
    auth: authUser
      ? {
          disabled: authUser.disabled,
          emailVerified: authUser.emailVerified,
          lastSignInTime: authUser.metadata.lastSignInTime,
          creationTime: authUser.metadata.creationTime,
        }
      : null,
    coach: coachDoc.exists ? { id: coachDoc.id, ...coachDoc.data() } : null,
    coachPrivate: privateCoachDoc.exists ? privateCoachDoc.data() : null,
    athleteSummary: {
      classesTaken: bookings.size,
      coaches: coachUsers,
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const { id } = await params
  const body = (await request.json()) as { disabled?: boolean }
  if (typeof body.disabled !== 'boolean') {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
  }

  await adminAuth.updateUser(id, { disabled: body.disabled })
  await adminDb.collection('users').doc(id).set(
    {
      accountDisabled: body.disabled,
      accountDisabledAt: body.disabled ? Date.now() : null,
      accountDisabledBy: body.disabled ? admin.uid : null,
      updatedAt: Date.now(),
    },
    { merge: true }
  )

  return NextResponse.json({ ok: true, disabled: body.disabled })
}


async function deleteQueryDocs(queryRef: FirebaseFirestore.Query) {
  const snapshot = await queryRef.get()
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()))
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

  const { id } = await params
  if (id === admin.uid) {
    return NextResponse.json(
      { error: 'No puedes eliminar tu propia cuenta desde aquí.' },
      { status: 400 }
    )
  }

  const ownerCollections = [
    'events',
    'entries',
    'teams',
    'atheltes',
    'athletes',
    'records',
    'records_V2',
    'results',
    'questions',
    'posts',
  ]

  await Promise.all([
    ...ownerCollections.map((collectionName) =>
      deleteQueryDocs(adminDb.collection(collectionName).where('userId', '==', id))
    ),
    deleteQueryDocs(adminDb.collection('bookings').where('athleteId', '==', id)),
    deleteQueryDocs(adminDb.collection('bookings').where('coachId', '==', id)),
  ])

  await adminDb.recursiveDelete(adminDb.collection('coaches').doc(id))
  await adminDb.collection('users').doc(id).delete()
  await adminAuth.deleteUser(id).catch((error) => {
    if (error?.code !== 'auth/user-not-found') throw error
  })

  return NextResponse.json({ ok: true })
}
